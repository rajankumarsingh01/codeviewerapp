import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  targetLabel: string; // e.g. "project root" ya folder ka naam, header me dikhane ke liye
  errorText: string | null;
  creating: boolean;
  onCreate: (fileName: string) => void;
  onClose: () => void;
}

export default function NewFileModal({
  visible,
  targetLabel,
  errorText,
  creating,
  onCreate,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState('');

  // Modal har baar khulne par input reset ho jaye
  useEffect(() => {
    if (visible) setName('');
  }, [visible]);

  const handleSubmit = () => {
    if (!name.trim() || creating) return;
    onCreate(name.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="document-outline" size={15} color={colors.accent} />
            <Text style={styles.headerText}>Nayi File</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.targetText} numberOfLines={1}>
            Yaha banegi: <Text style={styles.targetTextBold}>{targetLabel}</Text>
          </Text>

          <TextInput
            style={styles.input}
            autoFocus
            value={name}
            onChangeText={setName}
            placeholder="jaise: notes.txt ya App.js"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <View style={styles.footer}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, (!name.trim() || creating) && styles.createBtnDisabled]}
              onPress={handleSubmit}
              disabled={!name.trim() || creating}
            >
              <Text style={styles.createBtnText}>{creating ? 'Bana rahe hai...' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    card: {
      backgroundColor: colors.modalBg,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    headerText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 6, flex: 1 },
    targetText: { color: colors.textFaint, fontSize: 11.5, marginBottom: 10 },
    targetTextBold: { color: colors.textMuted, fontWeight: '600' },
    input: {
      backgroundColor: colors.background,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.codeText,
      fontSize: 14,
      fontFamily: 'monospace',
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    errorText: { color: colors.dangerAlt, fontSize: 12, marginTop: 8 },
    footer: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
    cancelBtnText: { color: colors.textMuted, fontSize: 13 },
    createBtn: { backgroundColor: colors.accent, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, marginLeft: 6 },
    createBtnDisabled: { opacity: 0.4 },
    createBtnText: { color: colors.accentText, fontSize: 13, fontWeight: '600' },
  });
}