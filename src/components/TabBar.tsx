import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
              <Ionicons name="close" size={14} color={active ? colors.textPrimary : colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: { backgroundColor: colors.surface, maxHeight: 38, flexGrow: 0 },
    content: { alignItems: 'center' },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 38,
      paddingHorizontal: 10,
      backgroundColor: colors.surfaceAlt,
      borderRightWidth: 1,
      borderRightColor: colors.background,
      maxWidth: 170,
    },
    activeTab: { backgroundColor: colors.background, borderTopWidth: 2, borderTopColor: colors.accent },
    tabText: { color: colors.textMuted, fontSize: 12, maxWidth: 110 },
    activeTabText: { color: colors.textPrimary },
    closeBtn: { marginLeft: 8 },
  });
}