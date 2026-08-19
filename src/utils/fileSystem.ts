import * as FileSystem from 'expo-file-system/legacy';

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  size?: number;
}

// Ek folder ke andar recursively saari files/folders padhta hai aur tree banata hai
export async function readDirectoryTree(dirPath: string): Promise<TreeNode[]> {
  try {
    const items = await FileSystem.readDirectoryAsync(dirPath);
    const nodes: TreeNode[] = [];

    for (const itemName of items) {
      const itemPath = `${dirPath}${itemName}`;
      const info = await FileSystem.getInfoAsync(itemPath);

      if (info.isDirectory) {
        const children = await readDirectoryTree(`${itemPath}/`);
        nodes.push({
          name: itemName,
          path: `${itemPath}/`,
          isDirectory: true,
          children,
        });
      } else {
        nodes.push({
          name: itemName,
          path: itemPath,
          isDirectory: false,
          size: info.exists ? info.size : undefined,
        });
      }
    }

    // Folders pehle, fir files — alphabetically dono
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return nodes;
  } catch (error) {
    console.error('Error reading directory:', dirPath, error);
    return [];
  }
}

// Chhota in-memory cache — same file baar baar disk se na padhni pade jab tabs switch karo
const contentCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 40;

// File ka text content padhta hai (cached)
export async function readFileContent(filePath: string): Promise<string> {
  const cached = contentCache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const content = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Cache bahut bada na ho jaye — purana entry hata do (simple FIFO)
    if (contentCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = contentCache.keys().next().value;
      if (oldestKey) contentCache.delete(oldestKey);
    }
    contentCache.set(filePath, content);

    return content;
  } catch (error) {
    console.error('Error reading file:', filePath, error);
    return '// Error: File padhi nahi ja saki';
  }
}

// Tree ko flatten karke sirf files ki flat list deta hai (folders nahi) — search ke liye useful
export function flattenFiles(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  const walk = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.isDirectory) {
        if (n.children) walk(n.children);
      } else {
        result.push(n);
      }
    }
  };
  walk(nodes);
  return result;
}

export interface ProjectStats {
  fileCount: number;
  folderCount: number;
  totalSize: number;
}

// Naya: Project Info — total files, folders aur size ek saath count karta hai (already
// loaded tree se, koi extra disk read nahi lagti)
export function computeProjectStats(nodes: TreeNode[]): ProjectStats {
  let fileCount = 0;
  let folderCount = 0;
  let totalSize = 0;

  const walk = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.isDirectory) {
        folderCount++;
        if (n.children) walk(n.children);
      } else {
        fileCount++;
        totalSize += n.size || 0;
      }
    }
  };
  walk(nodes);

  return { fileCount, folderCount, totalSize };
}

// Bytes ko human-readable form me dikhata hai (B / KB / MB / GB)
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'ico', 'webp', 'bmp', 'ttf', 'otf', 'woff', 'woff2',
  'mp4', 'mp3', 'wav', 'zip', 'gz', 'tar', 'pdf', 'exe', 'dll', 'so', 'class', 'jar',
  'apk', 'ipa', 'db', 'sqlite', 'lock', 'keystore',
]);

function isLikelyBinary(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return BINARY_EXTENSIONS.has(ext);
}

export interface SearchMatch {
  filePath: string;
  fileName: string;
  lineNumber: number;
  lineText: string;
}

export interface SearchResults {
  fileMatches: TreeNode[];
  contentMatches: SearchMatch[];
  truncated: boolean;
}

const MAX_FILES_TO_SCAN = 400;
const MAX_CONTENT_MATCHES = 100;
const MAX_FILE_SIZE_FOR_SEARCH = 300_000; // chars — bahut badi files skip karo (RAM bachane ke liye)

// Project-wide search: filename match + file content match, dono ek saath
export async function searchProject(
  allFiles: TreeNode[],
  query: string
): Promise<SearchResults> {
  const q = query.trim().toLowerCase();
  const result: SearchResults = { fileMatches: [], contentMatches: [], truncated: false };
  if (!q) return result;

  result.fileMatches = allFiles.filter((f) => f.name.toLowerCase().includes(q));

  let scanned = 0;

  for (const file of allFiles) {
    if (isLikelyBinary(file.name)) continue;
    if (file.path.includes('/node_modules/') || file.path.includes('/.git/')) continue;

    if (scanned >= MAX_FILES_TO_SCAN || result.contentMatches.length >= MAX_CONTENT_MATCHES) {
      result.truncated = true;
      break;
    }
    scanned++;

    try {
      const content = await readFileContent(file.path);
      if (!content || content.length > MAX_FILE_SIZE_FOR_SEARCH) continue;

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(q)) {
          result.contentMatches.push({
            filePath: file.path,
            fileName: file.name,
            lineNumber: i + 1,
            lineText: lines[i].trim().slice(0, 140),
          });
          if (result.contentMatches.length >= MAX_CONTENT_MATCHES) break;
        }
      }
    } catch {
      // unreadable file — skip karo, search rukna nahi chahiye
    }
  }

  return result;
}

export interface CreateFileResult {
  success: boolean;
  path?: string;
  error?: string;
}

// Naya: kisi bhi folder ke andar (ya project root me) ek nayi khaali file banata hai.
// dirPath hamesha trailing slash ke saath hona chahiye (jaise readDirectoryTree deta hai).
export async function createNewFile(dirPath: string, fileName: string): Promise<CreateFileResult> {
  const trimmedName = fileName.trim();

  if (!trimmedName) {
    return { success: false, error: 'File ka naam khaali nahi ho sakta' };
  }
  if (trimmedName.includes('/') || trimmedName.includes('\\')) {
    return { success: false, error: 'File ke naam me / ya \\ nahi ho sakta' };
  }
  if (trimmedName === '.' || trimmedName === '..') {
    return { success: false, error: 'Ye ek valid file naam nahi hai' };
  }

  const normalizedDir = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
  const fullPath = `${normalizedDir}${trimmedName}`;

  try {
    const existing = await FileSystem.getInfoAsync(fullPath);
    if (existing.exists) {
      return { success: false, error: 'Is naam ki file/folder pehle se maujood hai' };
    }

    await FileSystem.writeAsStringAsync(fullPath, '', {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return { success: true, path: fullPath };
  } catch (error) {
    console.error('Error creating file:', fullPath, error);
    return { success: false, error: 'File nahi ban saki, dobara try karo' };
  }
}

// Project ka poora folder delete karo (Project Management > Delete)
export async function deleteProjectFolder(projectPath: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(projectPath, { idempotent: true });
  } catch (error) {
    console.error('Error deleting project folder:', projectPath, error);
  }
}