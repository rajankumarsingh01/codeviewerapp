import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Poore app ke liye ek single color palette — har theme (dark/light) ke apne values
export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  activityBar: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentText: string;
  danger: string;
  dangerAlt: string;
  success: string;
  warning: string;
  codeText: string;
  lineNumber: string;
  highlightedLine: string;
  activeRow: string;
  folderIcon: string;
  overlay: string;
  modalBg: string;
  inputBg: string;
  placeholder: string;
}

// VS Code "Dark+" jaisa — original app ka default look
export const DARK_COLORS: ThemeColors = {
  background: '#1e1e1e',
  surface: '#252526',
  surfaceAlt: '#2d2d2d',
  activityBar: '#333333',
  border: '#3c3c3c',
  borderLight: '#333333',
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#858585',
  textDim: '#6a6a6a',
  textFaint: '#5a5a5a',
  accent: '#007ACC',
  accentText: '#ffffff',
  danger: '#e06c75',
  dangerAlt: '#F14C4C',
  success: '#4EC9B0',
  warning: '#DCDCAA',
  codeText: '#D4D4D4',
  lineNumber: '#5A5A5A',
  highlightedLine: '#2a2d3d',
  activeRow: '#37373d',
  folderIcon: '#c09553',
  overlay: 'rgba(0,0,0,0.55)',
  modalBg: '#252526',
  inputBg: '#3c3c3c',
  placeholder: '#5a5a5a',
};

// VS Code "Light+" jaisa
export const LIGHT_COLORS: ThemeColors = {
  background: '#ffffff',
  surface: '#f3f3f3',
  surfaceAlt: '#ececec',
  activityBar: '#f3f3f3',
  border: '#e0e0e0',
  borderLight: '#e5e5e5',
  textPrimary: '#1e1e1e',
  textSecondary: '#3b3b3b',
  textMuted: '#6e6e6e',
  textDim: '#8a8a8a',
  textFaint: '#a5a5a5',
  accent: '#007ACC',
  accentText: '#ffffff',
  danger: '#cd3131',
  dangerAlt: '#cd3131',
  success: '#008a5e',
  warning: '#795e26',
  codeText: '#1e1e1e',
  lineNumber: '#a0a0a0',
  highlightedLine: '#e8e8f5',
  activeRow: '#e4e6f1',
  folderIcon: '#b5860a',
  overlay: 'rgba(0,0,0,0.35)',
  modalBg: '#ffffff',
  inputBg: '#eeeeee',
  placeholder: '#a5a5a5',
};

const THEME_STORAGE_KEY = 'codeviewer:theme';

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  colors: DARK_COLORS,
  toggleTheme: () => {},
});

// Poore app ko wrap karta hai — App.tsx ke sabse bahar
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  // App start hote hi pichli saved theme choice load karo
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((val) => {
      if (val === 'light') setIsDark(false);
      else if (val === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const colors = useMemo(() => (isDark ? DARK_COLORS : LIGHT_COLORS), [isDark]);
  const value = useMemo(() => ({ isDark, colors, toggleTheme }), [isDark, colors, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Kisi bhi component me theme use karne ke liye: const { colors, isDark, toggleTheme } = useTheme();
export function useTheme() {
  return useContext(ThemeContext);
}