import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SidebarMode = 'explorer' | 'search';

interface Props {
  activeMode: SidebarMode;
  sidebarOpen: boolean;
  onSelect: (mode: SidebarMode) => void;
}

// VS Code jaisi narrow icon rail — left side me hamesha visible rehti hai
export default function ActivityBar({ activeMode, sidebarOpen, onSelect }: Props) {
  const isExplorerActive = sidebarOpen && activeMode === 'explorer';
  const isSearchActive = sidebarOpen && activeMode === 'search';

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={[styles.iconBtn, isExplorerActive && styles.activeIconBtn]}
        onPress={() => onSelect('explorer')}
      >
        <Ionicons
          name="documents-outline"
          size={22}
          color={isExplorerActive ? '#ffffff' : '#858585'}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.iconBtn, isSearchActive && styles.activeIconBtn]}
        onPress={() => onSelect('search')}
      >
        <Ionicons
          name="search"
          size={20}
          color={isSearchActive ? '#ffffff' : '#858585'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: 48,
    backgroundColor: '#333333',
    alignItems: 'center',
    paddingTop: 8,
  },
  iconBtn: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  activeIconBtn: {
    borderLeftColor: '#ffffff',
  },
});
