import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface OpenTab {
  path: string;
  name: string;
}

interface Props {
  tabs: OpenTab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export default function TabBar({ tabs, activePath, onSelect, onClose }: Props) {
  if (tabs.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.content}
    >
      {tabs.map((tab) => {
        const active = tab.path === activePath;
        return (
          <TouchableOpacity
            key={tab.path}
            style={[styles.tab, active && styles.activeTab]}
            onPress={() => onSelect(tab.path)}
          >
            <Text style={[styles.tabText, active && styles.activeTabText]} numberOfLines={1}>
              {tab.name}
            </Text>
            <TouchableOpacity
              onPress={() => onClose(tab.path)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={14} color={active ? '#ffffff' : '#858585'} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#252526',
    maxHeight: 38,
    flexGrow: 0,
  },
  content: {
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 10,
    backgroundColor: '#2d2d2d',
    borderRightWidth: 1,
    borderRightColor: '#1e1e1e',
    maxWidth: 170,
  },
  activeTab: {
    backgroundColor: '#1e1e1e',
    borderTopWidth: 2,
    borderTopColor: '#007ACC',
  },
  tabText: {
    color: '#969696',
    fontSize: 12,
    maxWidth: 110,
  },
  activeTabText: {
    color: '#ffffff',
  },
  closeBtn: {
    marginLeft: 8,
  },
});
