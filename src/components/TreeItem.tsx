import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TreeNode } from '../utils/fileSystem';
import { useTheme, ThemeColors } from '../context/ThemeContext';

interface Props {
  node: TreeNode;
  depth: number;
  expandedPaths: Set<string>;
  activePath: string | null;
  onFilePress: (node: TreeNode) => void;
  onToggleExpand: (path: string) => void;
  bookmarkedPaths?: Set<string>;
  onToggleBookmark?: (path: string, name: string) => void;
}

// VS Code jaisi file-extension based icon colors — dono themes me same rehte hain
const EXT_COLORS: Record<string, string> = {
  js: '#f0db4f',
  jsx: '#61dafb',
  ts: '#3178c6',
  tsx: '#3178c6',
  json: '#cbcb41',
  py: '#3572a5',
  java: '#b07219',
  md: '#8fb8de',
  css: '#563d7c',
  scss: '#c6538c',
  html: '#e34c26',
  yml: '#cb171e',
  yaml: '#cb171e',
};

function getFileIconColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return EXT_COLORS[ext] || '#8fb8de';
}

export default function TreeItem({
  node,
  depth,
  expandedPaths,
  activePath,
  onFilePress,
  onToggleExpand,
  bookmarkedPaths,
  onToggleBookmark,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const expanded = expandedPaths.has(node.path);
  const isActive = !node.isDirectory && node.path === activePath;
  const isBookmarked = !node.isDirectory && !!bookmarkedPaths?.has(node.path);

  const handlePress = () => {
    if (node.isDirectory) {
      onToggleExpand(node.path);
    } else {
      onFilePress(node);
    }
  };

  return (
    <View>
      <View style={[styles.row, { paddingLeft: 8 + depth * 14 }, isActive && styles.activeRow]}>
        <TouchableOpacity style={styles.rowMain} onPress={handlePress} activeOpacity={0.6}>
          {node.isDirectory ? (
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color={colors.textMuted}
              style={styles.chevron}
            />
          ) : (
            <View style={styles.chevron} />
          )}
          <Ionicons
            name={node.isDirectory ? (expanded ? 'folder-open' : 'folder') : 'document-text-outline'}
            size={16}
            color={node.isDirectory ? colors.folderIcon : getFileIconColor(node.name)}
            style={styles.icon}
          />
          <Text style={[styles.name, isActive && styles.activeName]} numberOfLines={1}>
            {node.name}
          </Text>
        </TouchableOpacity>

        {!node.isDirectory && onToggleBookmark && (
          <TouchableOpacity
            style={styles.starBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onToggleBookmark(node.path, node.name)}
          >
            <Ionicons
              name={isBookmarked ? 'star' : 'star-outline'}
              size={14}
              color={isBookmarked ? colors.folderIcon : colors.textFaint}
            />
          </TouchableOpacity>
        )}
      </View>

      {node.isDirectory && expanded && node.children && (
        <View>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              activePath={activePath}
              onFilePress={onFilePress}
              onToggleExpand={onToggleExpand}
              bookmarkedPaths={bookmarkedPaths}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
    rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
    activeRow: { backgroundColor: colors.activeRow },
    chevron: { width: 14, marginRight: 2 },
    icon: { marginRight: 6, width: 16 },
    name: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    activeName: { color: colors.textPrimary, fontWeight: '600' },
    starBtn: { paddingLeft: 6, paddingVertical: 5 },
  });
}