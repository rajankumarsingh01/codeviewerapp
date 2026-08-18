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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
import CodeView from '../components/CodeView';
import NotesView from '../components/NotesView';

// Android par smooth expand/collapse animation ke liye
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'IDE'>;
type FileViewMode = 'code' | 'notes';

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
      });
    }, SESSION_SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [projectPath, openTabs, activePath, expandedPaths, fontSize, wordWrap]);

  const allFiles = useMemo(() => flattenFiles(tree), [tree]);

  const openFile = useCallback(
    (path: string, name: string) => {
      setOpenTabs((prev) => {
        if (prev.some((t) => t.path === path)) return prev;
        const next = [...prev, { path, name }];
        if (next.length > MAX_OPEN_TABS) {
          return next.slice(next.length - MAX_OPEN_TABS);
        }
        return next;
      });
      setActivePath(path);
      setFileViewMode('code'); // naya file hamesha Code tab me khule
      if (isNarrowScreen) {
        setSidebarOpen(false);
      }
    },
    [isNarrowScreen]
  );

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
    },
    [activePath]
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
      openFile(filePath, fileName);
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

  const handleTabSelect = useCallback((path: string) => {
    setActivePath(path);
    setActiveLine(null);
    setFileViewMode('code');
  }, []);

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
/>


      <View style={styles.mainArea}>
        <TabBar tabs={openTabs} activePath={activePath} onSelect={handleTabSelect} onClose={handleCloseTab} />

        {activeTab ? (
          <>
            <View style={styles.zoomBar}>
              <View style={styles.viewModeSwitch}>
                <TouchableOpacity
                  onPress={() => setFileViewMode('code')}
                  style={[styles.viewModeBtn, fileViewMode === 'code' && styles.viewModeBtnActive]}
                >
                  <Ionicons
                    name="code-slash-outline"
                    size={13}
                    color={fileViewMode === 'code' ? '#ffffff' : '#858585'}
                  />
                  <Text
                    style={[styles.viewModeText, fileViewMode === 'code' && styles.viewModeTextActive]}
                  >
                    Code
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFileViewMode('notes')}
                  style={[styles.viewModeBtn, fileViewMode === 'notes' && styles.viewModeBtnActive]}
                >
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color={fileViewMode === 'notes' ? '#ffffff' : '#858585'}
                  />
                  <Text
                    style={[styles.viewModeText, fileViewMode === 'notes' && styles.viewModeTextActive]}
                  >
                    My Notes
                  </Text>
                </TouchableOpacity>
              </View>

              {fileViewMode === 'code' && (
                <View style={styles.zoomControls}>
                  <TouchableOpacity
                    onPress={() => setWordWrap((w) => !w)}
                    style={[styles.wrapBtn, wordWrap && styles.wrapBtnActive]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialIcons name="wrap-text" size={16} color={wordWrap ? '#ffffff' : '#cccccc'} />
                  </TouchableOpacity>

                  <View style={styles.zoomDivider} />

                  <TouchableOpacity
                    onPress={() => setFontSize((f) => Math.max(MIN_FONT_SIZE, f - 1))}
                    style={styles.zoomBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="remove" size={16} color="#cccccc" />
                  </TouchableOpacity>
                  <Text style={styles.zoomLabel}>{fontSize}px</Text>
                  <TouchableOpacity
                    onPress={() => setFontSize((f) => Math.min(MAX_FONT_SIZE, f + 1))}
                    style={styles.zoomBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="add" size={16} color="#cccccc" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {fileViewMode === 'code' ? (
              <CodeView
                key={activeTab.path}
                filePath={activeTab.path}
                fileName={activeTab.name}
                fontSize={fontSize}
                highlightLine={activeLine}
                wordWrap={wordWrap}
              />
            ) : (
              <NotesView key={activeTab.path} filePath={activeTab.path} fileName={activeTab.name} />
            )}
          </>
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
  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1e1e1e',
  },
  viewModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#252526',
    borderRadius: 5,
    padding: 2,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  viewModeBtnActive: {
    backgroundColor: '#007ACC',
  },
  viewModeText: {
    color: '#858585',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewModeTextActive: {
    color: '#ffffff',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrapBtn: {
    padding: 4,
    borderRadius: 4,
  },
  wrapBtnActive: {
    backgroundColor: '#007ACC',
  },
  zoomDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#3c3c3c',
    marginHorizontal: 10,
  },
  zoomBtn: {
    padding: 4,
  },
  zoomLabel: {
    color: '#858585',
    fontSize: 11,
    marginHorizontal: 6,
    fontFamily: 'monospace',
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