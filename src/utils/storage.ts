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

// Project list se aur uska saved session dono hata do
export async function removeProject(path: string): Promise<void> {
  try {
    const list = await getProjects();
    const next = list.filter((p) => p.path !== path);
    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    await AsyncStorage.removeItem(SESSION_PREFIX + path);
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