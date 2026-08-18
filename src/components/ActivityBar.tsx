import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';

export type SidebarMode = 'explorer' | 'search';

interface Props {
  activeMode: SidebarMode;
  sidebarOpen: boolean;
  onSelect: (mode: SidebarMode) => void;
  onExportNotes?: () => void;
  splitActive?: boolean;
  onToggleSplit?: () => void;
}

// VS Code jaisi narrow icon rail — left side me hamesha visible rehti hai
export default function ActivityBar({
  activeMode,
  sidebarOpen,
  onSelect,
  onExportNotes,
  splitActive,
  onToggleSplit,
}: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isExplorerActive = sidebarOpen && activeMode === 'explorer';
  const isSearchActive = sidebarOpen && activeMode === 'search';

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={[styles.iconBtn, isExplorerActive && styles.activeIconBtn]}
        onPress={() => onSelect('explorer')}
      >
        <Ionicons name="documents-outline" size={22} color={isExplorerActive ? colors.textPrimary : colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.iconBtn, isSearchActive && styles.activeIconBtn]}
        onPress={() => onSelect('search')}
      >
        <Ionicons name="search" size={20} color={isSearchActive ? colors.textPrimary : colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.spacer} />

      {onToggleSplit && (
        <TouchableOpacity
          style={[styles.iconBtn, splitActive && styles.activeIconBtn]}
          onPress={onToggleSplit}
        >
          <MaterialIcons name="vertical-split" size={20} color={splitActive ? colors.textPrimary : colors.textMuted} />
        </TouchableOpacity>
      )}

      {onExportNotes && (
        <TouchableOpacity style={styles.iconBtn} onPress={onExportNotes}>
          <Ionicons name="share-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Naya: Theme toggle button — bottom me */}
      <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme}>
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: { width: 48, backgroundColor: colors.activityBar, alignItems: 'center', paddingTop: 8, paddingBottom: 8 },
    iconBtn: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 2, borderLeftColor: 'transparent' },
    activeIconBtn: { borderLeftColor: colors.textPrimary },
    spacer: { flex: 1 },
  });
}