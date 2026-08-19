import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { cloneRepoToLocal } from '../utils/gitClone';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Clone'>;

interface LogLine {
  id: number;
  text: string;
  isError?: boolean;
}

export default function CloneScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [url, setUrl] = useState('');
  const [cloning, setCloning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [done, setDone] = useState(false);

  const logIdRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  const appendLog = useCallback((text: string, isError?: boolean) => {
    logIdRef.current += 1;
    setLogs((prev) => [...prev, { id: logIdRef.current, text, isError }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const handleClone = useCallback(async () => {
    if (!url.trim() || cloning) return;

    setLogs([]);
    setDone(false);
    setCloning(true);

    const result = await cloneRepoToLocal(url.trim(), appendLog);

    setCloning(false);

    if (result.success && result.projectPath && result.projectName) {
      setDone(true);
      setTimeout(() => {
        navigation.replace('IDE', {
          projectPath: result.projectPath!,
          projectName: result.projectName!,
        });
      }, 500);
    } else {
      appendLog(result.error || 'Clone fail ho gaya.', true);
    }
  }, [url, cloning, appendLog, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inputBar}>
        <Ionicons name="git-branch-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="https://github.com/owner/repo"
          placeholderTextColor={colors.placeholder}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          editable={!cloning}
          onSubmitEditing={handleClone}
          returnKeyType="go"
        />
        <TouchableOpacity
          style={[styles.cloneBtn, (!url.trim() || cloning) && styles.cloneBtnDisabled]}
          onPress={handleClone}
          disabled={!url.trim() || cloning}
        >
          <Text style={styles.cloneBtnText}>{cloning ? '...' : 'Clone'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.terminal}>
        <View style={styles.terminalHeader}>
          <View style={[styles.dot, { backgroundColor: '#ff5f56' }]} />
          <View style={[styles.dot, { backgroundColor: '#ffbd2e' }]} />
          <View style={[styles.dot, { backgroundColor: '#27c93f' }]} />
          <Text style={styles.terminalHeaderText}>terminal</Text>
        </View>

        <ScrollView ref={scrollRef} style={styles.terminalBody} contentContainerStyle={{ padding: 12 }}>
          {logs.length === 0 && !cloning ? (
            <Text style={styles.hintText}>
              Repo ka GitHub URL daalo aur "Clone" dabao. Sirf public repos support hain.
              {'\n\n'}Example: https://github.com/facebook/react
            </Text>
          ) : (
            logs.map((line) => (
              <Text key={line.id} style={[styles.logText, line.isError && styles.logTextError]}>
                {line.text}
              </Text>
            ))
          )}
          {done && <Text style={styles.logTextSuccess}>Project khul raha hai...</Text>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    input: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
      fontFamily: 'monospace',
      backgroundColor: colors.inputBg,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
      marginRight: 10,
    },
    cloneBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    cloneBtnDisabled: { opacity: 0.4 },
    cloneBtnText: { color: colors.accentText, fontWeight: '600', fontSize: 13 },
    terminal: { flex: 1, margin: 14, borderRadius: 8, overflow: 'hidden', backgroundColor: '#0c0c0c' },
    terminalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: '#1a1a1a',
    },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    terminalHeaderText: { color: '#888', fontSize: 11, marginLeft: 8, fontFamily: 'monospace' },
    terminalBody: { flex: 1 },
    hintText: { color: '#6a6a6a', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
    logText: { color: '#d4d4d4', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
    logTextError: { color: '#f14c4c' },
    logTextSuccess: { color: '#4ec9b0', marginTop: 4 },
  });
}