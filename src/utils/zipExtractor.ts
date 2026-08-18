import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';

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
    // 1. Project ka naam nikalo (zip filename se, .zip hata ke)
    const projectName = zipFileName.replace(/\.zip$/i, '');

    // 2. Destination folder banao app ke document directory me
    const projectsRoot = `${FileSystem.documentDirectory}projects/`;
    const projectPath = `${projectsRoot}${projectName}/`;

    // 3. Agar projects root folder nahi hai to banao
    const rootInfo = await FileSystem.getInfoAsync(projectsRoot);
    if (!rootInfo.exists) {
      await FileSystem.makeDirectoryAsync(projectsRoot, { intermediates: true });
    }

    // 4. Agar isi naam ka project pehle se hai to usko delete karo (fresh import)
    const existingInfo = await FileSystem.getInfoAsync(projectPath);
    if (existingInfo.exists) {
      await FileSystem.deleteAsync(projectPath, { idempotent: true });
    }
    await FileSystem.makeDirectoryAsync(projectPath, { intermediates: true });

    // 5. Zip file ko base64 me read karo
    const zipBase64 = await FileSystem.readAsStringAsync(zipUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 6. JSZip se load karo aur entries loop karo
    const zip = await JSZip.loadAsync(zipBase64, { base64: true });

    const entries = Object.keys(zip.files);

    for (const entryName of entries) {
      const entry = zip.files[entryName];
      const targetPath = `${projectPath}${entryName}`;

      if (entry.dir) {
        // Folder hai — bana do
        await FileSystem.makeDirectoryAsync(targetPath, { intermediates: true });
      } else {
        // File hai — parent folder ensure karo, fir content likho
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