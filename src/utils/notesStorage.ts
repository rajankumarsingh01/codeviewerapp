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