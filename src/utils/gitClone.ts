import * as FileSystem from 'expo-file-system/legacy';
import { extractZipBase64ToProject, ExtractResult } from './zipExtractor';

// NOTE on approach:
// Expo Go / managed workflow me real "git" binary chalana possible nahi hai (no backend,
// no native modules). Isliye ye actual git protocol clone nahi karta — balki GitHub ka
// public "codeload" zip-archive endpoint use karta hai (wahi endpoint jo "Download ZIP"
// button use karta hai). Isse hume repo ki latest snapshot mil jaati hai jise hum
// bilkul zip-import jaisa hi extract karke local storage me daal dete hain.
// Limitation: git history/commits nahi milte, sirf files ka current snapshot — jo is
// app ke "reading/viewing" use-case ke liye kaafi hai.

export interface ParsedRepo {
  owner: string;
  repo: string;
}

// Alag alag formats accept karta hai:
// https://github.com/owner/repo
// https://github.com/owner/repo.git
// github.com/owner/repo
// git@github.com:owner/repo.git
// owner/repo
export function parseGitHubUrl(input: string): ParsedRepo | null {
  let s = input.trim();
  if (!s) return null;

  s = s.replace(/\.git$/i, '');
  s = s.replace(/^git@github\.com:/i, '');
  s = s.replace(/^https?:\/\//i, '');
  s = s.replace(/^www\./i, '');
  s = s.replace(/^github\.com\//i, '');
  s = s.replace(/^\/+|\/+$/g, '');

  const parts = s.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  const repo = parts[1];
  if (!owner || !repo) return null;

  return { owner, repo };
}

async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Repository nahi mila. URL check karo, aur ensure karo ki repo public hai.');
    }
    if (res.status === 403) {
      throw new Error('GitHub rate limit lag gayi hai. Thodi der baad phir try karo.');
    }
    throw new Error(`GitHub API error (${res.status})`);
  }

  const data = await res.json();
  return data.default_branch || 'main';
}

export type CloneLogger = (line: string) => void;

export async function cloneRepoToLocal(
  inputUrl: string,
  onLog: CloneLogger
): Promise<ExtractResult> {
  let tmpZipPath: string | null = null;

  try {
    const parsed = parseGitHubUrl(inputUrl);
    if (!parsed) {
      return {
        success: false,
        error: 'Invalid GitHub URL. Format: https://github.com/owner/repo',
      };
    }
    const { owner, repo } = parsed;

    onLog(`$ git clone ${inputUrl}`);
    onLog(`Resolving ${owner}/${repo} ...`);

    const branch = await getDefaultBranch(owner, repo);
    onLog(`Default branch: ${branch}`);
    onLog(`Cloning into '${repo}'...`);
    onLog(`remote: Enumerating objects...`);

    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
    tmpZipPath = `${FileSystem.cacheDirectory}gitclone_${repo}_${Date.now()}.zip`;

    let lastLoggedPct = -1;
    const downloadResumable = FileSystem.createDownloadResumable(
      zipUrl,
      tmpZipPath,
      {},
      (progress) => {
        if (progress.totalBytesExpectedToWrite > 0) {
          const pct = Math.floor(
            (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
          );
          const bucket = Math.floor(pct / 10) * 10;
          if (bucket !== lastLoggedPct && bucket > 0) {
            lastLoggedPct = bucket;
            onLog(`Receiving objects: ${bucket}%`);
          }
        }
      }
    );

    const downloadResult = await downloadResumable.downloadAsync();

    if (!downloadResult || downloadResult.status !== 200) {
      return {
        success: false,
        error: 'Repo download fail ho gaya. Repo public hai aur naam sahi hai, ye check karo.',
      };
    }

    onLog('Receiving objects: 100%, done.');
    onLog('Resolving deltas: 100%, done.');
    onLog('Extracting files...');

    const zipBase64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const result = await extractZipBase64ToProject(zipBase64, repo, true);

    if (result.success) {
      onLog(`done.`);
    } else {
      onLog(`error: ${result.error || 'extraction failed'}`);
    }

    return result;
  } catch (err: any) {
    const message = err?.message || 'Clone fail ho gaya';
    onLog(`error: ${message}`);
    return { success: false, error: message };
  } finally {
    if (tmpZipPath) {
      try {
        await FileSystem.deleteAsync(tmpZipPath, { idempotent: true });
      } catch {
        // cleanup fail hui to bhi koi baat nahi
      }
    }
  }
}