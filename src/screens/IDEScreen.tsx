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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import ActivityBar, { SidebarMode } from '../components/ActivityBar';
import Sidebar from '../components/Sidebar';
import TabBar, { OpenTab } from '../components/TabBar';
import CodeView from '../components/CodeView';

// Android par smooth expand/collapse animation ke liye
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'IDE'>;

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 13;
const ACTIVITY_BAR_WIDTH = 48;
const TABLET_BREAKPOINT = 700; // is se zyada width ho to tablet-jaisa side-by-side layout
const MAX_OPEN_TABS = 10; // low-RAM devices ke liye sensible cap
const SESSION_SAVE_DEBOUNCE_MS = 600;

export default function IDEScreen({ route }: Props) {
  const { projectPath, projectName } = route.params;

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setScreenWidth(window.width));
    return () => sub.remove();
  }, []);

  // Phone par sidebar ek overlay drawer ki tarah kaam karega (code ke upar float, full readable width).
  // Tablet/wide screen par purana push layout (side-by-side) chalta rahega.
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

  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  // Session restore hone tak save mat karo, warna khaali session purane save ko overwrite kar dega
  const sessionRestoredRef = useRef(false);

  useEffect(() => {
    (async () => {
      setLoadingTree(true);
      const result = await readDirectoryTree(projectPath);
      setTree(result);
      setLoadingTree(false);

      // Project khulte hi "recently opened" list ke liye timestamp update karo
      touchProjectOpened(projectPath);

      // Pichli baar ka session (tabs, expanded folders, zoom) restore karo
      const session = await getProjectSession(projectPath);
      if (session) {
        setOpenTabs(session.openTabs || []);
        setActivePath(session.activePath ?? null);
        setExpandedPaths(new Set(session.expandedPaths || []));
        if (session.fontSize) setFontSize(session.fontSize);
      }
      sessionRestoredRef.current = true;
    })();
  }, [projectPath]);

  // Session ko debounce karke save karo — har chhoti change pe disk-write na ho
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!sessionRestoredRef.current) return; // pehli load ke waqt overwrite mat karo
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveProjectSession(projectPath, {
        openTabs,
        activePath,
        expandedPaths: Array.from(expandedPaths),
        fontSize,
      });
    }, SESSION_SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [projectPath, openTabs, activePath, expandedPaths, fontSize]);

  const allFiles = useMemo(() => flattenFiles(tree), [tree]);

  const openFile = useCallback(
    (path: string, name: string) => {
      setOpenTabs((prev) => {
        if (prev.some((t) => t.path === path)) return prev;
        const next = [...prev, { path, name }];
        // Bahut zyada tabs khuli na reh jayein — sabse purani (non-active) tab hata do
        if (next.length > MAX_OPEN_TABS) {
          return next.slice(next.length - MAX_OPEN_TABS);
        }
        return next;
      });
      setActivePath(path);
      // Phone par file khulte hi sidebar apne aap band ho jaye — poora screen code ko mile
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
  }, []);

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
      <ActivityBar activeMode={sidebarMode} sidebarOpen={sidebarOpen} onSelect={handleSelectMode} />

      {/* Main code area — hamesha full width leta hai, sidebar iske UPAR float karta hai (phone par) */}
      <View style={styles.mainArea}>
        <TabBar tabs={openTabs} activePath={activePath} onSelect={handleTabSelect} onClose={handleCloseTab} />

        {activeTab ? (
          <>
            <View style={styles.zoomBar}>
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
            <CodeView
              key={activeTab.path}
              filePath={activeTab.path}
              fileName={activeTab.name}
              fontSize={fontSize}
              highlightLine={activeLine}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="code-slash-outline" size={48} color="#3c3c3c" />
            <Text style={styles.emptyStateText}>Koi file nahi khuli</Text>
            <Text style={styles.emptyStateSubText}>Sidebar se ek file select karo</Text>
          </View>
        )}
      </View>

      {/* Phone: sidebar ek overlay drawer hai jo code ke upar float karta hai, backdrop tap karke band ho jata hai */}
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

      {/* Tablet: sidebar normal push layout me side-by-side rehta hai */}
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
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1e1e1e',
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