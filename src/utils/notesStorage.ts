import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTE_PREFIX = 'codeviewer:note:';

// File ka note padhta hai (khaali string agar note nahi hai)
export async function getNote(filePath: string): Promise<string> {
  try {
    const val = await AsyncStorage.getItem(NOTE_PREFIX + filePath);
    return val ?? '';
  } catch (e) {
    console.error('getNote error:', e);
    return '';
  }
}

// File ka note save karta hai. Khaali text ho to key hi hata deta hai (storage clean rehta hai)
export async function saveNote(filePath: string, text: string): Promise<void> {
  try {
    if (!text.trim()) {
      await AsyncStorage.removeItem(NOTE_PREFIX + filePath);
    } else {
      await AsyncStorage.setItem(NOTE_PREFIX + filePath, text);
    }
  } catch (e) {
    console.error('saveNote error:', e);
  }
}

// Kisi file ka note hai ya nahi — baad me tree me chhota indicator dikhane ke kaam aayega
export async function hasNote(filePath: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(NOTE_PREFIX + filePath);
    return !!val && val.trim().length > 0;
  } catch {
    return false;
  }
}

// Project delete hone par uske andar ki saari files ke notes bhi saaf karo (orphan data na bache)
export async function deleteNotesUnderPath(projectPath: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = allKeys.filter(
      (k) => k.startsWith(NOTE_PREFIX) && k.slice(NOTE_PREFIX.length).startsWith(projectPath)
    );
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    console.error('deleteNotesUnderPath error:', e);
  }
}



// ─────────────────────────────────────────────────────────────
// PHASE 9b — Inline line-level comments
// Har file ke liye ek chhota JSON blob store hota hai: { lineNumber: commentText }
// Isse ek file ke saare line-comments sirf EK AsyncStorage read me mil jaate hain.
// ─────────────────────────────────────────────────────────────

const LINE_NOTES_PREFIX = 'codeviewer:linenotes:';

export type LineNotesMap = Record<number, string>;

// Ek file ke saare line-comments ek saath padhta hai
export async function getLineNotes(filePath: string): Promise<LineNotesMap> {
  try {
    const raw = await AsyncStorage.getItem(LINE_NOTES_PREFIX + filePath);
    if (!raw) return {};
    return JSON.parse(raw) as LineNotesMap;
  } catch (e) {
    console.error('getLineNotes error:', e);
    return {};
  }
}

// Ek specific line ka comment save/update karta hai.
// Khaali text ho to us line ka entry hata deta hai (storage clean rehta hai).
// Updated map return karta hai taaki caller turant UI update kar sake.
export async function saveLineNote(
  filePath: string,
  lineNumber: number,
  text: string
): Promise<LineNotesMap> {
  const notes = await getLineNotes(filePath);
  if (!text.trim()) {
    delete notes[lineNumber];
  } else {
    notes[lineNumber] = text;
  }
  try {
    if (Object.keys(notes).length === 0) {
      await AsyncStorage.removeItem(LINE_NOTES_PREFIX + filePath);
    } else {
      await AsyncStorage.setItem(LINE_NOTES_PREFIX + filePath, JSON.stringify(notes));
    }
  } catch (e) {
    console.error('saveLineNote error:', e);
  }
  return notes;
}

// Kisi ek line ka comment hata deta hai
export async function deleteLineNote(filePath: string, lineNumber: number): Promise<LineNotesMap> {
  return saveLineNote(filePath, lineNumber, '');
}

// Project delete hone par uske andar ki saari files ke line-comments bhi saaf karo
export async function deleteLineNotesUnderPath(projectPath: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = allKeys.filter(
      (k) =>
        k.startsWith(LINE_NOTES_PREFIX) && k.slice(LINE_NOTES_PREFIX.length).startsWith(projectPath)
    );
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    console.error('deleteLineNotesUnderPath error:', e);
  }
}




// ─────────────────────────────────────────────────────────────
// PHASE 9c — Actual file editing (local overlay, original zip/extracted
// file kabhi touch nahi hota) + Export/copy all notes
// ─────────────────────────────────────────────────────────────

const EDITED_CONTENT_PREFIX = 'codeviewer:editedcontent:';

// Agar file ka edited (overlay) version hai to wahi return karta hai, warna null
// (null ka matlab: abhi tak koi edit save nahi hui, original file hi dikhao)
export async function getEditedContent(filePath: string): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(EDITED_CONTENT_PREFIX + filePath);
    return val; // AsyncStorage khud hi missing key ke liye null deta hai
  } catch (e) {
    console.error('getEditedContent error:', e);
    return null;
  }
}

// User ka edited content overlay ke roop me save karta hai — original file disk par untouched rehti hai
export async function saveEditedContent(filePath: string, text: string): Promise<void> {
  try {
    await AsyncStorage.setItem(EDITED_CONTENT_PREFIX + filePath, text);
  } catch (e) {
    console.error('saveEditedContent error:', e);
  }
}

// "Reset to original" — saved overlay hata do, ab original (disk wali) file dikhegi
export async function discardEditedContent(filePath: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(EDITED_CONTENT_PREFIX + filePath);
  } catch (e) {
    console.error('discardEditedContent error:', e);
  }
}

// Project delete hone par uske andar ki saari files ke edited overlays bhi saaf karo
export async function deleteEditedContentUnderPath(projectPath: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = allKeys.filter(
      (k) =>
        k.startsWith(EDITED_CONTENT_PREFIX) &&
        k.slice(EDITED_CONTENT_PREFIX.length).startsWith(projectPath)
    );
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    console.error('deleteEditedContentUnderPath error:', e);
  }
}

// Poore project ke saare file-notes + line-comments ek formatted text me jod deta hai,
// taaki ek click me copy karke kisi AI model ko context ke saath diya ja sake.
export async function exportAllNotes(
  projectName: string,
  projectPath: string,
  files: { path: string; name: string }[]
): Promise<string> {
  const sections: string[] = [];

  for (const file of files) {
    const [fileNote, lineNotes] = await Promise.all([getNote(file.path), getLineNotes(file.path)]);

    const lineEntries = Object.keys(lineNotes)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b)
      .filter((ln) => lineNotes[ln]?.trim());

    if (!fileNote.trim() && lineEntries.length === 0) continue; // is file me kuch note hi nahi hai, skip

    const relativePath = file.path.startsWith(projectPath)
      ? file.path.slice(projectPath.length)
      : file.path;

    const parts: string[] = [`📄 ${relativePath}`, '─'.repeat(Math.min(50, relativePath.length + 2))];

    if (fileNote.trim()) {
      parts.push(fileNote.trim());
    }

    if (lineEntries.length > 0) {
      if (fileNote.trim()) parts.push(''); // file note aur line notes ke beech chhota gap
      for (const ln of lineEntries) {
        parts.push(`Line ${ln}: ${lineNotes[ln].trim()}`);
      }
    }

    sections.push(parts.join('\n'));
  }

  if (sections.length === 0) {
    return '';
  }

  const header = [
    `NOTES EXPORT — ${projectName}`,
    `Generated: ${new Date().toLocaleString()}`,
    '='.repeat(50),
  ].join('\n');

  return `${header}\n\n${sections.join('\n\n')}`;
}