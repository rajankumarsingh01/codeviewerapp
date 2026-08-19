import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { addOrUpdateProject } from './storage';

export interface ExtractResult {
  success: boolean;
  projectPath?: string;
  projectName?: string;
  error?: string;
}

// Zip file ko pick karke, extract karke local storage me save karta hai
export async function extractZipToLocal(
  zipUri: string,
  zipFileName: string
): Promise<ExtractResult> {
  try {
    const projectName = zipFileName.replace(/\.zip$/i, '');

    const zipBase64 = await FileSystem.readAsStringAsync(zipUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return await extractZipBase64ToProject(zipBase64, projectName, false);
  } catch (error: any) {
    console.error('Zip extraction error:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error during extraction',
    };
  }
}

// Core extraction logic — ek base64 zip string ko project folder me extract karta hai.
// zip-import (Home screen) aur git-clone (Clone screen) dono isko reuse karte hain,
// taaki extraction ka code duplicate na ho.
//
// stripTopFolder: GitHub jaise source ke zip archives ke andar ek single top-level
// folder hota hai (jaise "repo-main/"). Ye true karne par us wrapper folder ko hata
// diya jata hai, taaki project ka tree seedha repo root se shuru ho, extra nesting na ho.
export async function extractZipBase64ToProject(
  zipBase64: string,
  projectName: string,
  stripTopFolder: boolean
): Promise<ExtractResult> {
  try {
    const projectsRoot = `${FileSystem.documentDirectory}projects/`;
    const projectPath = `${projectsRoot}${projectName}/`;

    const rootInfo = await FileSystem.getInfoAsync(projectsRoot);
    if (!rootInfo.exists) {
      await FileSystem.makeDirectoryAsync(projectsRoot, { intermediates: true });
    }

    const existingInfo = await FileSystem.getInfoAsync(projectPath);
    if (existingInfo.exists) {
      await FileSystem.deleteAsync(projectPath, { idempotent: true });
    }
    await FileSystem.makeDirectoryAsync(projectPath, { intermediates: true });

    const zip = await JSZip.loadAsync(zipBase64, { base64: true });
    const entries = Object.keys(zip.files);

    // Agar stripTopFolder true hai, ye pehla path-segment nikal ke sabme se hata dega
    let topFolderPrefix: string | null = null;
    if (stripTopFolder && entries.length > 0) {
      const firstSlashIdx = entries[0].indexOf('/');
      if (firstSlashIdx > 0) {
        const candidate = entries[0].substring(0, firstSlashIdx + 1);
        const allShareIt = entries.every((e) => e.startsWith(candidate));
        if (allShareIt) topFolderPrefix = candidate;
      }
    }

    for (const entryName of entries) {
      const entry = zip.files[entryName];

      let relativeName = entryName;
      if (topFolderPrefix && relativeName.startsWith(topFolderPrefix)) {
        relativeName = relativeName.substring(topFolderPrefix.length);
      }
      if (!relativeName) continue; // top-level folder entry khud ko skip karo

      const targetPath = `${projectPath}${relativeName}`;

      if (entry.dir) {
        await FileSystem.makeDirectoryAsync(targetPath, { intermediates: true });
      } else {
        const parentDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
        const parentInfo = await FileSystem.getInfoAsync(parentDir);
        if (!parentInfo.exists) {
          await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
        }

        const fileContentBase64 = await entry.async('base64');
        await FileSystem.writeAsStringAsync(targetPath, fileContentBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    }

    await addOrUpdateProject(projectName, projectPath);

    return {
      success: true,
      projectPath,
      projectName,
    };
  } catch (error: any) {
    console.error('Zip extraction error:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error during extraction',
    };
  }
}