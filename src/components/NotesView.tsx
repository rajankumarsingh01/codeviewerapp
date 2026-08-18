import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { getNote, saveNote } from '../utils/notesStorage';
import { useTheme, ThemeColors } from '../context/ThemeContext';

interface Props {
  filePath: string;
  fileName: string;
}

const SAVE_DEBOUNCE_MS = 500;

export default function NotesView({ filePath, fileName }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);

  const loadedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;
    setLoading(true);
    getNote(filePath).then((saved) => {
      if (!cancelled) {
        setText(saved);
        setLoading(false);
        loadedRef.current = true;
      }
    });
    return () => {
      cancelled = true;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [filePath]);

  const handleChange = useCallback(
    (val: string) => {
      setText(val);
      if (!loadedRef.current) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await saveNote(filePath, val);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1000);
      }, SAVE_DEBOUNCE_MS);
    },
    [filePath]
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText} numberOfLines={1}>
          NOTES — {fileName}
        </Text>
        {savedFlash && <Text style={styles.savedText}>Saved</Text>}
      </View>
      <TextInput
        style={styles.input}
        multiline
        value={text}
        onChangeText={handleChange}
        placeholder="Is file ke baare me apne samajh me jo aaya wo yahan likho... (jaise 'ye function login check karta hai')"
        placeholderTextColor={colors.placeholder}
        textAlignVertical="top"
        autoCorrect
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerText: { color: colors.textMuted, fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.5, flex: 1, marginRight: 10 },
    savedText: { color: colors.success, fontSize: 11, fontWeight: '600' },
    input: { flex: 1, color: colors.codeText, fontSize: 14, padding: 16, lineHeight: 22 },
  });
}