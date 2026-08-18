import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TreeNode } from '../utils/fileSystem';

interface Props {
  node: TreeNode;
  depth: number;
  expandedPaths: Set<string>;
  activePath: string | null;
  onFilePress: (node: TreeNode) => void;
  onToggleExpand: (path: string) => void;
}

// VS Code jaisi file-extension based icon colors (approximate)
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
}: Props) {
  const expanded = expandedPaths.has(node.path);
  const isActive = !node.isDirectory && node.path === activePath;

  const handlePress = () => {
    if (node.isDirectory) {
      onToggleExpand(node.path);
    } else {
      onFilePress(node);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.row, { paddingLeft: 8 + depth * 14 }, isActive && styles.activeRow]}
        onPress={handlePress}
      >
        {node.isDirectory ? (
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={14}
            color="#858585"
            style={styles.chevron}
          />
        ) : (
          <View style={styles.chevron} />
        )}
        <Ionicons
          name={node.isDirectory ? (expanded ? 'folder-open' : 'folder') : 'document-text-outline'}
          size={16}
          color={node.isDirectory ? '#c09553' : getFileIconColor(node.name)}
          style={styles.icon}
        />
        <Text style={[styles.name, isActive && styles.activeName]} numberOfLines={1}>
          {node.name}
        </Text>
      </TouchableOpacity>

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
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingRight: 8,
  },
  activeRow: {
    backgroundColor: '#37373d',
  },
  chevron: {
    width: 14,
    marginRight: 2,
  },
  icon: {
    marginRight: 6,
    width: 16,
  },
  name: {
    fontSize: 13,
    color: '#cccccc',
    flex: 1,
  },
  activeName: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
