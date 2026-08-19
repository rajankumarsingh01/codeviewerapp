import AsyncStorage from '@react-native-async-storage/async-storage';

// ============ Projects list (Home screen) ============

export interface ProjectMeta {
  name: string;
  path: string;
  importedAt: number;
  lastOpenedAt: number;
}

const PROJECTS_KEY = 'codeviewer:projects';
const SESSION_PREFIX = 'codeviewer:session:'; // + projectPath
const BOOKMARKS_PREFIX = 'codeviewer:bookmarks:'; // + projectPath
const RECENT_FILES_PREFIX = 'codeviewer:recent:'; // + projectPath

export const MAX_RECENT_FILES = 15;

// Sab imported projects, sabse recently opened pehle
export async function getProjects(): Promise<ProjectMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const list: ProjectMeta[] = JSON.parse(raw);
    return list.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  } catch (e) {
    console.error('getProjects error:', e);
    return [];
  }
}

// Naya project import hone par ya purana dobara khulne par call karo
export async function addOrUpdateProject(name: string, path: string): Promise<void> {
  try {
    const list = await getProjects();
    const now = Date.now();
    const idx = list.findIndex((p) => p.path === path);
    if (idx >= 0) {
      list[idx].lastOpenedAt = now;
    } else {
      list.push({ name, path, importedAt: now, lastOpenedAt: now });
    }
    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('addOrUpdateProject error:', e);
  }
}

// Project khulte hi "last opened" time update karo (list me recency ke liye)
export async function touchProjectOpened(path: string): Promise<void> {
  try {
    const list = await getProjects();
    const idx = list.findIndex((p) => p.path === path);
    if (idx >= 0) {
      list[idx].lastOpenedAt = Date.now();
      await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error('touchProjectOpened error:', e);
  }
}

// Project list se aur uska saved session/bookmarks/recent sab hata do
export async function removeProject(path: string): Promise<void> {
  try {
    const list = await getProjects();
    const next = list.filter((p) => p.path !== path);
    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    await AsyncStorage.removeItem(SESSION_PREFIX + path);
    await AsyncStorage.removeItem(BOOKMARKS_PREFIX + path);
    await AsyncStorage.removeItem(RECENT_FILES_PREFIX + path);
  } catch (e) {
    console.error('removeProject error:', e);
  }
}

// ============ Per-project session (open tabs, expanded folders, zoom) ============

export interface ProjectSession {
  openTabs: { path: string; name: string }[];
  activePath: string | null;
  expandedPaths: string[];
  fontSize: number;
  wordWrap: boolean;
  // Phase: Split View — optional taaki purani saved sessions (in fields ke bina) bhi crash na karein
  splitActive?: boolean;
  splitPath?: string | null;
}

export async function getProjectSession(projectPath: string): Promise<ProjectSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_PREFIX + projectPath);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('getProjectSession error:', e);
    return null;
  }
}

export async function saveProjectSession(
  projectPath: string,
  session: ProjectSession
): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_PREFIX + projectPath, JSON.stringify(session));
  } catch (e) {
    console.error('saveProjectSession error:', e);
  }
}

// ============ Bookmarks (per-project) ============

export interface BookmarkEntry {
  path: string;
  name: string;
  bookmarkedAt: number;
}

// Sab bookmarks, sabse naya bookmark pehle
export async function getBookmarks(projectPath: string): Promise<BookmarkEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_PREFIX + projectPath);
    if (!raw) return [];
    const list: BookmarkEntry[] = JSON.parse(raw);
    return list.sort((a, b) => b.bookmarkedAt - a.bookmarkedAt);
  } catch (e) {
    console.error('getBookmarks error:', e);
    return [];
  }
}

// Star icon tap hone par: agar already bookmarked hai to hata do, warna add karo
export async function toggleBookmark(
  projectPath: string,
  path: string,
  name: string
): Promise<BookmarkEntry[]> {
  try {
    const list = await getBookmarks(projectPath);
    const idx = list.findIndex((b) => b.path === path);
    let next: BookmarkEntry[];
    if (idx >= 0) {
      next = list.filter((b) => b.path !== path);
    } else {
      next = [...list, { path, name, bookmarkedAt: Date.now() }];
    }
    await AsyncStorage.setItem(BOOKMARKS_PREFIX + projectPath, JSON.stringify(next));
    return next;
  } catch (e) {
    console.error('toggleBookmark error:', e);
    return [];
  }
}

// ============ Recent Files (per-project) ============

export interface RecentFileEntry {
  path: string;
  name: string;
  openedAt: number;
}

// Sab recent files, sabse recently khuli hui pehle
export async function getRecentFiles(projectPath: string): Promise<RecentFileEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_FILES_PREFIX + projectPath);
    if (!raw) return [];
    const list: RecentFileEntry[] = JSON.parse(raw);
    return list.sort((a, b) => b.openedAt - a.openedAt);
  } catch (e) {
    console.error('getRecentFiles error:', e);
    return [];
  }
}

// Jab bhi koi file open ho, ye call karo — duplicate hata ke top pe le aata hai, list ko MAX_RECENT_FILES tak trim karta hai
export async function addRecentFile(
  projectPath: string,
  path: string,
  name: string
): Promise<void> {
  try {
    const list = await getRecentFiles(projectPath);
    const next = list.filter((f) => f.path !== path);
    next.unshift({ path, name, openedAt: Date.now() });
    await AsyncStorage.setItem(
      RECENT_FILES_PREFIX + projectPath,
      JSON.stringify(next.slice(0, MAX_RECENT_FILES))
    );
  } catch (e) {
    console.error('addRecentFile error:', e);
  }
}

export async function clearRecentFiles(projectPath: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_FILES_PREFIX + projectPath);
  } catch (e) {
    console.error('clearRecentFiles error:', e);
  }
}