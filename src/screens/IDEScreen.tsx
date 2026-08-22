import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import {
  readDirectoryTree,
  flattenFiles,
  searchProject,
  computeProjectStats,
  createNewFile,
  TreeNode,
  SearchResults,
} from '../utils/fileSystem';
import {
  getProjectSession,
  saveProjectSession,
  touchProjectOpened,
  getBookmarks,
  toggleBookmark,
  BookmarkEntry,
  getRecentFiles,
  addRecentFile,
  clearRecentFiles,
  RecentFileEntry,
  MAX_RECENT_FILES,
} from '../utils/storage';

import { exportAllNotes } from '../utils/notesStorage';

import ActivityBar, { SidebarMode } from '../components/ActivityBar';
import Sidebar from '../components/Sidebar';
import TabBar, { OpenTab } from '../components/TabBar';
import EditorPane, { FileViewMode } from '../components/EditorPane';
import NewFileModal from '../components/NewFileModal';
import { useTheme, ThemeColors } from '../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'IDE'>;
type FocusedPane = 'left' | 'right';

const MIN_FONT_SIZE = 3;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 13;
const ACTIVITY_BAR_WIDTH = 48;
const TABLET_BREAKPOINT = 700;
const MAX_OPEN_TABS = 10;
const SESSION_SAVE_DEBOUNCE_MS = 600;
const SEARCH_DEBOUNCE_MS = 280;
const MIN_SEARCH_CHARS = 1;

export default function IDEScreen({ route }: Props) {
  const { projectPath, projectName } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setScreenWidth(window.width));
    return () => sub.remove();
  }, []);

  const isNarrowScreen = screenWidth < TABLET_BREAKPOINT;
  const sidebarWidth = isNarrowScreen
    ? Math.min(320, screenWidth - ACTIVITY_BAR_WIDTH - 40)
    : 260;

  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('explorer');

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>('code');

  const [splitActive, setSplitActive] = useState(false);
  const [splitPath, setSplitPath] = useState<string | null>(null);
  const [rightViewMode, setRightViewMode] = useState<FileViewMode>('code');
  const [focusedPane, setFocusedPane] = useState<FocusedPane>('left');

  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [wordWrap, setWordWrap] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const searchSeqRef = useRef(0);

  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>([]);

  // Naya: New File modal state — kis folder me file banani hai, koi error, create ho raha hai
  const [newFileTargetDir, setNewFileTargetDir] = useState<string | null>(null);
  const [newFileError, setNewFileError] = useState<string | null>(null);
  const [creatingFile, setCreatingFile] = useState(false);

  const sessionRestoredRef = useRef(false);

  useEffect(() => {
    (async () => {
      setLoadingTree(true);
      const result = await readDirectoryTree(projectPath);
      setTree(result);
      setLoadingTree(false);

      touchProjectOpened(projectPath);

      const session = await getProjectSession(projectPath);
      if (session) {
        setOpenTabs(session.openTabs || []);
        setActivePath(session.activePath ?? null);
        setExpandedPaths(new Set(session.expandedPaths || []));
        if (session.fontSize) setFontSize(session.fontSize);
        setWordWrap(session.wordWrap ?? false);
        if (session.splitActive && session.splitPath) {
          setSplitActive(true);
          setSplitPath(session.splitPath);
        }
      }
      sessionRestoredRef.current = true;

      const [savedBookmarks, savedRecent] = await Promise.all([
        getBookmarks(projectPath),
        getRecentFiles(projectPath),
      ]);
      setBookmarks(savedBookmarks);
      setRecentFiles(savedRecent);
    })();
  }, [projectPath]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!sessionRestoredRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveProjectSession(projectPath, {
        openTabs,
        activePath,
        expandedPaths: Array.from(expandedPaths),
        fontSize,
        wordWrap,
        splitActive,
        splitPath,
      });
    }, SESSION_SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [projectPath, openTabs, activePath, expandedPaths, fontSize, wordWrap, splitActive, splitPath]);

  const allFiles = useMemo(() => flattenFiles(tree), [tree]);
  const projectStats = useMemo(() => computeProjectStats(tree), [tree]);

  const bookmarkedPaths = useMemo(() => new Set(bookmarks.map((b) => b.path)), [bookmarks]);

  const recordRecentFile = useCallback(
    (path: string, name: string) => {
      setRecentFiles((prev) => {
        const next = [{ path, name, openedAt: Date.now() }, ...prev.filter((f) => f.path !== path)];
        return next.slice(0, MAX_RECENT_FILES);
      });
      addRecentFile(projectPath, path, name);
    },
    [projectPath]
  );

  const openFile = useCallback(
    (path: string, name: string, forcePane?: FocusedPane) => {
      setOpenTabs((prev) => {
        if (prev.some((t) => t.path === path)) return prev;
        const next = [...prev, { path, name }];
        if (next.length > MAX_OPEN_TABS) {
          return next.slice(next.length - MAX_OPEN_TABS);
        }
        return next;
      });

      const targetPane: FocusedPane =
        forcePane ?? (splitActive && focusedPane === 'right' ? 'right' : 'left');

      if (targetPane === 'right') {
        setSplitPath(path);
        setRightViewMode('code');
      } else {
        setActivePath(path);
        setFileViewMode('code');
      }

      recordRecentFile(path, name);

      if (isNarrowScreen) {
        setSidebarOpen(false);
      }
    },
    [isNarrowScreen, splitActive, focusedPane, recordRecentFile]
  );

  const toggleSplit = useCallback(() => {
    setSplitActive((prev) => {
      const next = !prev;
      if (next) {
        setSplitPath((currentSplitPath) => {
          if (currentSplitPath) return currentSplitPath;
          const other = openTabs.find((t) => t.path !== activePath);
          return other ? other.path : activePath;
        });
        setFocusedPane('right');
      } else {
        setFocusedPane('left');
      }
      return next;
    });
  }, [openTabs, activePath]);

  const closeSplit = useCallback(() => {
    setSplitActive(false);
    setSplitPath(null);
    setFocusedPane('left');
  }, []);

  const handleFilePress = useCallback(
    (node: TreeNode) => {
      openFile(node.path, node.name);
      setActiveLine(null);
    },
    [openFile]
  );

  const handleToggleExpand = useCallback((path: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleCollapseAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPaths(new Set());
  }, []);

  const handleCloseTab = useCallback(
    (path: string) => {
      setOpenTabs((prev) => {
        const idx = prev.findIndex((t) => t.path === path);
        const next = prev.filter((t) => t.path !== path);

        if (activePath === path) {
          if (next.length === 0) {
            setActivePath(null);
          } else {
            const newIdx = Math.max(0, idx - 1);
            setActivePath(next[newIdx].path);
          }
          setActiveLine(null);
          setFileViewMode('code');
        }
        return next;
      });
      if (splitPath === path) {
        setSplitPath(null);
      }
    },
    [activePath, splitPath]
  );

  const runSearch = useCallback(
    async (query: string) => {
      const mySeq = ++searchSeqRef.current;
      const q = query.trim();
      if (!q) {
        setSearchResults(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      const results = await searchProject(allFiles, q);
      // Agar iske baad koi naya search shuru ho chuka hai, ye purana result discard karo
      if (mySeq !== searchSeqRef.current) return;
      setSearchResults(results);
      setSearching(false);
    },
    [allFiles]
  );

  // Live search — type karte hi (thodi si debounce ke saath) results aa jaate hain,
  // Enter dabane ki zaroorat nahi
  useEffect(() => {
    if (!searchQuery.trim()) {
      searchSeqRef.current++;
      setSearchResults(null);
      setSearching(false);
      return;
    }
    if (searchQuery.trim().length < MIN_SEARCH_CHARS) return;

    const t = setTimeout(() => {
      runSearch(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [searchQuery, runSearch]);

  const handleSearchSubmit = useCallback(() => {
    runSearch(searchQuery);
  }, [searchQuery, runSearch]);

  const handleSearchClear = useCallback(() => {
    searchSeqRef.current++;
    setSearchQuery('');
    setSearchResults(null);
    setSearching(false);
  }, []);

  const handleSearchResultPress = useCallback(
    (filePath: string, fileName: string, lineNumber?: number) => {
      openFile(filePath, fileName, 'left');
      setActiveLine(lineNumber ?? null);
    },
    [openFile]
  );

  const handleToggleBookmark = useCallback(
    async (path: string, name: string) => {
      const next = await toggleBookmark(projectPath, path, name);
      setBookmarks(next);
    },
    [projectPath]
  );

  const handleClearRecent = useCallback(async () => {
    await clearRecentFiles(projectPath);
    setRecentFiles([]);
  }, [projectPath]);

  const handleSelectMode = useCallback(
    (mode: SidebarMode) => {
      if (mode === sidebarMode && sidebarOpen) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSidebarOpen(false);
      } else {
        setSidebarMode(mode);
        setSidebarOpen(true);
      }
    },
    [sidebarMode, sidebarOpen]
  );

  const handleTabSelect = useCallback(
    (path: string) => {
      if (splitActive && focusedPane === 'right') {
        setSplitPath(path);
        setRightViewMode('code');
      } else {
        setActivePath(path);
        setActiveLine(null);
        setFileViewMode('code');
      }
    },
    [splitActive, focusedPane]
  );

  // Naya: "New File" button/icon tap hone par modal khulta hai us folder ke liye
  const handleOpenNewFileModal = useCallback((dirPath: string) => {
    setNewFileError(null);
    setNewFileTargetDir(dirPath);
  }, []);

  const handleCloseNewFileModal = useCallback(() => {
    setNewFileTargetDir(null);
    setNewFileError(null);
  }, []);

  // Naya: file create karo, tree refresh karo, us folder ko expand karo, aur nayi file
  // seedha khol do editor me — taaki user turant likhna shuru kar sake
  const handleConfirmCreateFile = useCallback(
    async (fileName: string) => {
      if (!newFileTargetDir) return;
      setCreatingFile(true);
      setNewFileError(null);

      const result = await createNewFile(newFileTargetDir, fileName);

      setCreatingFile(false);

      if (!result.success || !result.path) {
        setNewFileError(result.error || 'File nahi ban saki');
        return;
      }

      // Poori tree refresh karo taaki nayi file dikhe
      const refreshedTree = await readDirectoryTree(projectPath);
      setTree(refreshedTree);

      // Target folder ko expand kar do (root ke case me ye no-op hai)
      if (newFileTargetDir !== projectPath) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedPaths((prev) => new Set(prev).add(newFileTargetDir));
      }

      setNewFileTargetDir(null);
      setNewFileError(null);

      // Nayi file seedha khol do taaki user likhna shuru kar sake
      openFile(result.path, fileName);
    },
    [newFileTargetDir, projectPath, openFile]
  );

  const handleExportNotes = useCallback(async () => {
    const text = await exportAllNotes(projectName, projectPath, allFiles);
    if (!text) {
      Alert.alert('Koi notes nahi mile', 'Abhi tak is project ki kisi file me koi note nahi likha gaya.');
      return;
    }
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Is project ke saare notes clipboard me copy ho gaye. Ab kahin bhi paste kar sakte ho.');
  }, [projectName, projectPath, allFiles]);

  const activeTab = openTabs.find((t) => t.path === activePath) || null;
  const splitTab = openTabs.find((t) => t.path === splitPath) || null;

  if (loadingTree) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Project load ho raha hai...</Text>
      </View>
    );
  }

  const sidebarElement = sidebarOpen && (
    <Sidebar
      mode={sidebarMode}
      projectName={projectName}
      projectPath={projectPath}
      tree={tree}
      stats={projectStats}
      expandedPaths={expandedPaths}
      activePath={activePath}
      onFilePress={handleFilePress}
      onToggleExpand={handleToggleExpand}
      onCollapseAll={handleCollapseAll}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onSearchSubmit={handleSearchSubmit}
      onSearchClear={handleSearchClear}
      searching={searching}
      searchResults={searchResults}
      onSearchResultPress={handleSearchResultPress}
      bookmarkedPaths={bookmarkedPaths}
      onToggleBookmark={handleToggleBookmark}
      bookmarks={bookmarks}
      recentFiles={recentFiles}
      onClearRecent={handleClearRecent}
      onCreateFile={handleOpenNewFileModal}
    />
  );

  return (
    <View style={styles.root}>
      <ActivityBar
        activeMode={sidebarMode}
        sidebarOpen={sidebarOpen}
        onSelect={handleSelectMode}
        onExportNotes={handleExportNotes}
        splitActive={splitActive}
        onToggleSplit={toggleSplit}
      />

      <View style={styles.mainArea}>
        <TabBar tabs={openTabs} activePath={activePath} onSelect={handleTabSelect} onClose={handleCloseTab} />

        {activeTab || splitTab ? (
          <View style={[styles.panesRow, isNarrowScreen && styles.panesColumn]}>
            <View style={splitActive ? styles.paneHalf : styles.paneFull}>
              <EditorPane
                tab={activeTab}
                viewMode={fileViewMode}
                onViewModeChange={setFileViewMode}
                fontSize={fontSize}
                onZoomIn={() => setFontSize((f) => Math.min(MAX_FONT_SIZE, f + 1))}
                onZoomOut={() => setFontSize((f) => Math.max(MIN_FONT_SIZE, f - 1))}
                wordWrap={wordWrap}
                onToggleWordWrap={() => setWordWrap((w) => !w)}
                highlightLine={activeLine}
                focused={focusedPane === 'left'}
                onFocus={() => setFocusedPane('left')}
                showFocusIndicator={splitActive}
                emptyTitle="Koi file nahi khuli"
                emptySubtitle="Sidebar se ek file select karo"
              />
            </View>

            {splitActive && (
              <>
                <View style={isNarrowScreen ? styles.paneDividerHorizontal : styles.paneDividerVertical} />
                <View style={styles.paneHalf}>
                  <EditorPane
                    tab={splitTab}
                    viewMode={rightViewMode}
                    onViewModeChange={setRightViewMode}
                    fontSize={fontSize}
                    onZoomIn={() => setFontSize((f) => Math.min(MAX_FONT_SIZE, f + 1))}
                    onZoomOut={() => setFontSize((f) => Math.max(MIN_FONT_SIZE, f - 1))}
                    wordWrap={wordWrap}
                    onToggleWordWrap={() => setWordWrap((w) => !w)}
                    highlightLine={null}
                    focused={focusedPane === 'right'}
                    onFocus={() => setFocusedPane('right')}
                    showFocusIndicator={splitActive}
                    onCloseSplit={closeSplit}
                    emptyTitle="Doosri file chuno"
                    emptySubtitle="Sidebar se koi file tap karo, ye is pane me khulegi"
                  />
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="code-slash-outline" size={48} color={colors.surfaceAlt} />
            <Text style={styles.emptyStateText}>Koi file nahi khuli</Text>
            <Text style={styles.emptyStateSubText}>Sidebar se ek file select karo</Text>
          </View>
        )}
      </View>

      {isNarrowScreen && sidebarOpen && (
        <>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setSidebarOpen(false)}
          />
          <View style={[styles.overlaySidebar, { width: sidebarWidth }]}>{sidebarElement}</View>
        </>
      )}

      {!isNarrowScreen && sidebarOpen && (
        <View style={{ width: sidebarWidth }}>{sidebarElement}</View>
      )}

      <NewFileModal
        visible={newFileTargetDir != null}
        targetLabel={
          newFileTargetDir
            ? newFileTargetDir === projectPath
              ? `${projectName} (root)`
              : newFileTargetDir
                  .replace(projectPath, '')
                  .replace(/\/$/, '') || `${projectName} (root)`
            : ''
        }
        errorText={newFileError}
        creating={creatingFile}
        onCreate={handleConfirmCreateFile}
        onClose={handleCloseNewFileModal}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
    loadingScreen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: colors.textMuted, marginTop: 12, fontSize: 13 },
    mainArea: { flex: 1 },
    backdrop: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: ACTIVITY_BAR_WIDTH,
      right: 0,
      backgroundColor: colors.overlay,
    },
    overlaySidebar: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: ACTIVITY_BAR_WIDTH,
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 8,
    },
    panesRow: { flex: 1, flexDirection: 'row' },
    panesColumn: { flexDirection: 'column' },
    paneFull: { flex: 1 },
    paneHalf: { flex: 1 },
    paneDividerVertical: { width: 1, backgroundColor: colors.border },
    paneDividerHorizontal: { height: 1, backgroundColor: colors.border },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyStateText: { color: colors.textDim, fontSize: 15, marginTop: 12, fontWeight: '600' },
    emptyStateSubText: { color: colors.textFaint, fontSize: 12, marginTop: 4 },
  });
}