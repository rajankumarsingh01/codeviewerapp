import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { getNote, saveNote } from '../utils/notesStorage';

interface Props {
  filePath: string;
  fileName: string;
}

const SAVE_DEBOUNCE_MS = 500;

export default function NotesView({ filePath, fileName }: Props) {
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
      if (!loadedRef.current) return; // pehli load ke waqt save mat karo
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
        <ActivityIndicator size="large" color="#007ACC" />
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
        placeholderTextColor="#5a5a5a"
        textAlignVertical="top"
        autoCorrect
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerText: {
    color: '#858585',
    fontSize: 11,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 10,
  },
  savedText: {
    color: '#4EC9B0',
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    color: '#D4D4D4',
    fontSize: 14,
    padding: 16,
    lineHeight: 22,
  },
});