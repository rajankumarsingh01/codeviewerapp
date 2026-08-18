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
import type { TreeNode, SearchResults } from '../utils/fileSystem';
import TreeItem from './TreeItem';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type SidebarMode = 'explorer' | 'search';

type ResultRow =
  | { type: 'file'; node: TreeNode }
  | { type: 'match'; filePath: string; fileName: string; lineNumber: number; lineText: string };

interface Props {
  mode: SidebarMode;
  projectName: string;
  tree: TreeNode[];
  expandedPaths: Set<string>;
  activePath: string | null;
  onFilePress: (node: TreeNode) => void;
  onToggleExpand: (path: string) => void;
  onCollapseAll: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearchSubmit: () => void;
  searching: boolean;
  searchResults: SearchResults | null;
  onSearchResultPress: (filePath: string, fileName: string, lineNumber?: number) => void;
}

export default function Sidebar(props: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (props.mode === 'search') {
    const rows: ResultRow[] = props.searchResults
      ? [
          ...props.searchResults.fileMatches.map((f): ResultRow => ({ type: 'file', node: f })),
          ...props.searchResults.contentMatches.map(
            (m): ResultRow => ({
              type: 'match',
              filePath: m.filePath,
              fileName: m.fileName,
              lineNumber: m.lineNumber,
              lineText: m.lineText,
            })
          ),
        ]
      : [];

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
          />
        </View>

        {props.searching ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item, i) =>
              item.type === 'file' ? `f-${item.node.path}` : `m-${i}-${item.filePath}-${item.lineNumber}`
            }
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (item.type === 'file') {
                return (
                  <TouchableOpacity
                    style={styles.resultRow}
                    onPress={() => props.onSearchResultPress(item.node.path, item.node.name)}
                  >
                    <Ionicons name="document-text-outline" size={14} color="#8fb8de" style={{ marginRight: 6 }} />
                    <Text style={styles.resultFileName} numberOfLines={1}>
                      {item.node.name}
                    </Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  style={styles.matchRow}
                  onPress={() => props.onSearchResultPress(item.filePath, item.fileName, item.lineNumber)}
                >
                  <Text style={styles.matchFileName} numberOfLines={1}>
                    {item.fileName} <Text style={styles.matchLineNum}>:{item.lineNumber}</Text>
                  </Text>
                  <Text style={styles.matchLineText} numberOfLines={1}>
                    {item.lineText}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {props.searchQuery ? 'Koi result nahi mila' : 'Type karke Enter dabao search karne ke liye'}
              </Text>
            }
            ListFooterComponent={
              props.searchResults?.truncated ? (
                <Text style={styles.truncatedText}>Bahut zyada results the — kuch hi dikhaye gaye</Text>
              ) : null
            }
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.explorerHeaderRow}>
        <Text style={styles.header} numberOfLines={1}>
          {props.projectName.toUpperCase()}
        </Text>
        <TouchableOpacity onPress={props.onCollapseAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="remove-circle-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
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
    matchRow: { paddingVertical: 5, paddingHorizontal: 10 },
    matchFileName: { color: colors.accent, fontSize: 12 },
    matchLineNum: { color: colors.success },
    matchLineText: { color: colors.textDim, fontSize: 12, fontFamily: 'monospace', marginTop: 1 },
    emptyText: { color: colors.placeholder, fontSize: 12, textAlign: 'center', marginTop: 20, paddingHorizontal: 10 },
    truncatedText: { color: colors.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 10 },
  });
}