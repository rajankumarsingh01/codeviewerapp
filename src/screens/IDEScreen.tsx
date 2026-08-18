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
  TreeNode,
  SearchResults,
} from '../utils/fileSystem';
import { getProjectSession, saveProjectSession, touchProjectOpened } from '../utils/storage';

import { exportAllNotes } from '../utils/notesStorage';  


import ActivityBar, { SidebarMode } from '../components/ActivityBar';
import Sidebar from '../components/Sidebar';
import TabBar, { OpenTab } from '../components/TabBar';
import EditorPane, { FileViewMode } from '../components/EditorPane';

// Android par smooth expand/collapse animation ke liye
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'IDE'>;
type FocusedPane = 'left' | 'right';

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 13;
const ACTIVITY_BAR_WIDTH = 48;
const TABLET_BREAKPOINT = 700;
const MAX_OPEN_TABS = 10;
const SESSION_SAVE_DEBOUNCE_MS = 600;

export default function IDEScreen({ route }: Props) {
  const { projectPath, projectName } = route.params;

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

  // Phase — Split View: right pane ek doosri file dikhata hai, left ke saath side-by-side
  const [splitActive, setSplitActive] = useState(false);
  const [splitPath, setSplitPath] = useState<string | null>(null);
  const [rightViewMode, setRightViewMode] = useState<FileViewMode>('code');
  const [focusedPane, setFocusedPane] = useState<FocusedPane>('left');

  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [wordWrap, setWordWrap] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

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

  const openFile = useCallback(
    // forcePane diya ho to usi pane me khulti hai (jaise search result hamesha left me),
    // warna jo pane abhi "focused" hai usme khulti hai — yahi split view ka core behaviour hai.
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
        setFileViewMode('code'); // naya file hamesha Code tab me khule
      }

      if (isNarrowScreen) {
        setSidebarOpen(false);
      }
    },
    [isNarrowScreen, splitActive, focusedPane]
  );

  const toggleSplit = useCallback(() => {
    setSplitActive((prev) => {
      const next = !prev;
      if (next) {
        // Split kholte waqt agar koi doosri tab pehle se khuli hai to wahi right pane me dikhao,
        // warna filhaal wahi active file dono taraf dikhao (user turant koi file tap kar sakta hai)
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
      // Agar band ki gayi tab right pane me khuli thi, use bhi clear karo
      if (splitPath === path) {
        setSplitPath(null);
      }
    },
    [activePath, splitPath]
  );

  const handleSearchSubmit = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const results = await searchProject(allFiles, searchQuery);
    setSearchResults(results);
    setSearching(false);
  }, [searchQuery, allFiles]);

  const handleSearchResultPress = useCallback(
    (filePath: string, fileName: string, lineNumber?: number) => {
      // Search result hamesha LEFT pane me khulta hai — predictable rehta hai chahe
      // right pane focused ho, kyunki line-highlight sirf left pane me dikhta hai
      openFile(filePath, fileName, 'left');
      setActiveLine(lineNumber ?? null);
    },
    [openFile]
  );

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
      // Top tab bar bhi focused pane ke hisaab se hi route karti hai
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

    // Phase 9c — poore project ke saare notes (file-level + line-level) ek text me copy karo
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
        <ActivityIndicator size="large" color="#007ACC" />
        <Text style={styles.loadingText}>Project load ho raha hai...</Text>
      </View>
    );
  }

  const sidebarElement = sidebarOpen && (
    <Sidebar
      mode={sidebarMode}
      projectName={projectName}
      tree={tree}
      expandedPaths={expandedPaths}
      activePath={activePath}
      onFilePress={handleFilePress}
      onToggleExpand={handleToggleExpand}
      onCollapseAll={handleCollapseAll}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onSearchSubmit={handleSearchSubmit}
      searching={searching}
      searchResults={searchResults}
      onSearchResultPress={handleSearchResultPress}
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
          <View
            style={[
              styles.panesRow,
              isNarrowScreen && styles.panesColumn,
            ]}
          >
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
            <Ionicons name="code-slash-outline" size={48} color="#3c3c3c" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#858585',
    marginTop: 12,
    fontSize: 13,
  },
  mainArea: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: ACTIVITY_BAR_WIDTH,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  panesRow: {
    flex: 1,
    flexDirection: 'row',
  },
  panesColumn: {
    flexDirection: 'column',
  },
  paneFull: {
    flex: 1,
  },
  paneHalf: {
    flex: 1,
  },
  paneDividerVertical: {
    width: 1,
    backgroundColor: '#000000',
  },
  paneDividerHorizontal: {
    height: 1,
    backgroundColor: '#000000',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#5a5a5a',
    fontSize: 15,
    marginTop: 12,
    fontWeight: '600',
  },
  emptyStateSubText: {
    color: '#4a4a4a',
    fontSize: 12,
    marginTop: 4,
  },
});