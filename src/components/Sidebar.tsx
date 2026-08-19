import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TreeNode, SearchResults, ProjectStats } from '../utils/fileSystem';
import { formatBytes } from '../utils/fileSystem';
import type { BookmarkEntry, RecentFileEntry } from '../utils/storage';
import TreeItem from './TreeItem';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type SidebarMode = 'explorer' | 'search' | 'bookmarks' | 'recent';

type ResultRow =
  | { type: 'section'; label: string }
  | { type: 'file'; node: TreeNode }
  | { type: 'group'; filePath: string; fileName: string; count: number }
  | { type: 'match'; filePath: string; fileName: string; lineNumber: number; lineText: string };

// Query ke matching hisse ko highlight karta hai (case-insensitive), baaki normal
function HighlightedText({
  text,
  query,
  style,
  highlightStyle,
  numberOfLines,
}: {
  text: string;
  query: string;
  style: any;
  highlightStyle: any;
  numberOfLines?: number;
}) {
  const q = query.trim();
  if (!q) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }
  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  let idx = lower.indexOf(qLower, cursor);
  while (idx !== -1) {
    if (idx > cursor) parts.push({ text: text.slice(cursor, idx), match: false });
    parts.push({ text: text.slice(idx, idx + q.length), match: true });
    cursor = idx + q.length;
    idx = lower.indexOf(qLower, cursor);
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        p.match ? (
          <Text key={i} style={highlightStyle}>
            {p.text}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        )
      )}
    </Text>
  );
}

interface Props {
  mode: SidebarMode;
  projectName: string;
  tree: TreeNode[];
  stats: ProjectStats;
  expandedPaths: Set<string>;
  activePath: string | null;
  onFilePress: (node: TreeNode) => void;
  onToggleExpand: (path: string) => void;
  onCollapseAll: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  searching: boolean;
  searchResults: SearchResults | null;
  onSearchResultPress: (filePath: string, fileName: string, lineNumber?: number) => void;
  bookmarkedPaths: Set<string>;
  onToggleBookmark: (path: string, name: string) => void;
  bookmarks: BookmarkEntry[];
  recentFiles: RecentFileEntry[];
  onClearRecent: () => void;
}

export default function Sidebar(props: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (props.mode === 'search') {
    const q = props.searchQuery.trim();
    const results = props.searchResults;

    const rows: ResultRow[] = [];
    if (results) {
      if (results.fileMatches.length > 0) {
        rows.push({ type: 'section', label: `FILES (${results.fileMatches.length})` });
        for (const f of results.fileMatches) rows.push({ type: 'file', node: f });
      }
      if (results.contentMatches.length > 0) {
        const fileCount = new Set(results.contentMatches.map((m) => m.filePath)).size;
        rows.push({
          type: 'section',
          label: `IN CONTENTS (${results.contentMatches.length} in ${fileCount} files)`,
        });
        let lastPath: string | null = null;
        for (const m of results.contentMatches) {
          if (m.filePath !== lastPath) {
            const countInFile = results.contentMatches.filter((x) => x.filePath === m.filePath).length;
            rows.push({ type: 'group', filePath: m.filePath, fileName: m.fileName, count: countInFile });
            lastPath = m.filePath;
          }
          rows.push({ type: 'match', filePath: m.filePath, fileName: m.fileName, lineNumber: m.lineNumber, lineText: m.lineText });
        }
      }
    }

    const totalCount = results ? results.fileMatches.length + results.contentMatches.length : 0;

    return (
      <View style={styles.panel}>
        <Text style={styles.header}>SEARCH</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={14} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Files aur code me dhundo"
            placeholderTextColor={colors.placeholder}
            value={props.searchQuery}
            onChangeText={props.onSearchQueryChange}
            onSubmitEditing={props.onSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {props.searching ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginLeft: 4 }} />
          ) : q.length > 0 ? (
            <TouchableOpacity
              onPress={props.onSearchClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 2 }}
            >
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {q.length > 0 && results && (
          <Text style={styles.resultCountText}>
            {totalCount > 0 ? `${totalCount} result${totalCount === 1 ? '' : 's'}` : 'Koi result nahi mila'}
          </Text>
        )}

        <FlatList
          data={rows}
          keyExtractor={(item, i) => {
            if (item.type === 'section') return `s-${item.label}`;
            if (item.type === 'file') return `f-${item.node.path}`;
            if (item.type === 'group') return `g-${item.filePath}`;
            return `m-${i}-${item.filePath}-${item.lineNumber}`;
          }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return <Text style={styles.sectionLabel}>{item.label}</Text>;
            }
            if (item.type === 'file') {
              return (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => props.onSearchResultPress(item.node.path, item.node.name)}
                >
                  <Ionicons name="document-text-outline" size={14} color="#8fb8de" style={{ marginRight: 6 }} />
                  <HighlightedText
                    text={item.node.name}
                    query={q}
                    style={styles.resultFileName}
                    highlightStyle={styles.highlightText}
                    numberOfLines={1}
                  />
                </TouchableOpacity>
              );
            }
            if (item.type === 'group') {
              return (
                <View style={styles.groupHeader}>
                  <Ionicons name="document-text-outline" size={12} color={colors.textMuted} style={{ marginRight: 5 }} />
                  <Text style={styles.groupHeaderText} numberOfLines={1}>
                    {item.fileName}
                  </Text>
                  <Text style={styles.groupHeaderCount}>{item.count}</Text>
                </View>
              );
            }
            return (
              <TouchableOpacity
                style={styles.matchRow}
                onPress={() => props.onSearchResultPress(item.filePath, item.fileName, item.lineNumber)}
              >
                <Text style={styles.matchLineNum}>{item.lineNumber}</Text>
                <HighlightedText
                  text={item.lineText}
                  query={q}
                  style={styles.matchLineText}
                  highlightStyle={styles.highlightText}
                  numberOfLines={1}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !props.searching ? (
              <Text style={styles.emptyText}>
                {q ? 'Koi result nahi mila' : 'Type karte hi results yaha aa jayenge'}
              </Text>
            ) : null
          }
          ListFooterComponent={
            props.searchResults?.truncated ? (
              <Text style={styles.truncatedText}>Bahut zyada results the — kuch hi dikhaye gaye</Text>
            ) : null
          }
        />
      </View>
    );
  }

  if (props.mode === 'bookmarks') {
    return (
      <View style={styles.panel}>
        <Text style={styles.header}>BOOKMARKS</Text>
        <FlatList
          data={props.bookmarks}
          keyExtractor={(item) => item.path}
          renderItem={({ item }) => (
            <View style={styles.listRow}>
              <TouchableOpacity
                style={styles.listRowMain}
                onPress={() => props.onSearchResultPress(item.path, item.name)}
              >
                <Ionicons name="document-text-outline" size={14} color="#8fb8de" style={{ marginRight: 6 }} />
                <Text style={styles.resultFileName} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.starBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => props.onToggleBookmark(item.path, item.name)}
              >
                <Ionicons name="star" size={14} color={colors.folderIcon} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Koi bookmark nahi hai abhi tak. File explorer me kisi file ke star icon ko tap karo.
            </Text>
          }
        />
      </View>
    );
  }

  if (props.mode === 'recent') {
    return (
      <View style={styles.panel}>
        <View style={styles.explorerHeaderRow}>
          <Text style={styles.header}>RECENT FILES</Text>
          {props.recentFiles.length > 0 && (
            <TouchableOpacity onPress={props.onClearRecent} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={props.recentFiles}
          keyExtractor={(item) => item.path}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => props.onSearchResultPress(item.path, item.name)}
            >
              <Ionicons name="document-text-outline" size={14} color="#8fb8de" style={{ marginRight: 6 }} />
              <Text style={styles.resultFileName} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Abhi tak koi file open nahi ki gayi hai.</Text>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.explorerHeaderRow}>
        <Text style={styles.explorerHeader} numberOfLines={1}>
          {props.projectName.toUpperCase()}
        </Text>
        <TouchableOpacity onPress={props.onCollapseAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="remove-circle-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <Text style={styles.statsText}>
        {props.stats.fileCount} files · {props.stats.folderCount} folders · {formatBytes(props.stats.totalSize)}
      </Text>
      <FlatList
        data={props.tree}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => (
          <TreeItem
            node={item}
            depth={0}
            expandedPaths={props.expandedPaths}
            activePath={props.activePath}
            onFilePress={props.onFilePress}
            onToggleExpand={props.onToggleExpand}
            bookmarkedPaths={props.bookmarkedPaths}
            onToggleBookmark={props.onToggleBookmark}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Koi files nahi mili</Text>}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    panel: { flex: 1, backgroundColor: colors.surface },
    header: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 12, paddingVertical: 10 },
    explorerHeader: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2 },
    statsText: { color: colors.textFaint, fontSize: 10, paddingHorizontal: 12, paddingBottom: 8 },
    explorerHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      marginHorizontal: 10,
      marginBottom: 8,
      paddingHorizontal: 8,
      borderRadius: 4,
      height: 32,
    },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13, marginLeft: 6, padding: 0 },
    resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10 },
    resultFileName: { color: colors.textSecondary, fontSize: 13, flex: 1 },
    resultCountText: { color: colors.textFaint, fontSize: 10.5, paddingHorizontal: 12, paddingBottom: 4 },
    sectionLabel: {
      color: colors.textFaint,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 4,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.surfaceAlt,
      marginTop: 2,
    },
    groupHeaderText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 },
    groupHeaderCount: {
      color: colors.textFaint,
      fontSize: 10,
      fontWeight: '700',
      backgroundColor: colors.border,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 8,
      overflow: 'hidden',
    },
    highlightText: {
      backgroundColor: colors.warning + '55',
      color: colors.textPrimary,
      fontWeight: '700',
    },
    matchRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 10, paddingLeft: 22, gap: 8 },
    matchFileName: { color: colors.accent, fontSize: 12 },
    matchLineNum: { color: colors.success, fontSize: 11, fontFamily: 'monospace', minWidth: 22 },
    matchLineText: { color: colors.textDim, fontSize: 12, fontFamily: 'monospace', flex: 1 },
    listRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
    listRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingLeft: 10 },
    starBtn: { paddingLeft: 6, paddingVertical: 6 },
    emptyText: { color: colors.placeholder, fontSize: 12, textAlign: 'center', marginTop: 20, paddingHorizontal: 10 },
    truncatedText: { color: colors.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 10 },
  });
}