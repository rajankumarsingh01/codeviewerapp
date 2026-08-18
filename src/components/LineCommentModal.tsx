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
  lineNumber: number | null;
  initialText: string;
  onSave: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function LineCommentModal({
  visible,
  lineNumber,
  initialText,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (visible) setText(initialText);
  }, [initialText, lineNumber, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="chatbubble-outline" size={14} color={colors.warning} />
            <Text style={styles.headerText}>Line {lineNumber ?? ''} pe comment</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            multiline
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder="Is line ke baare me chhota note likho..."
            placeholderTextColor={colors.placeholder}
            textAlignVertical="top"
          />

          <View style={styles.footer}>
            {initialText.trim().length > 0 && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8 }}>
                <Ionicons name="trash-outline" size={14} color={colors.dangerAlt} />
                <Text style={styles.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(text)}>
              <Text style={styles.saveBtnText}>Save</Text>
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
    input: {
      backgroundColor: colors.background,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.codeText,
      fontSize: 14,
      padding: 10,
      minHeight: 90,
      maxHeight: 180,
    },
    footer: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    deleteBtn: { flexDirection: 'row', alignItems: 'center' },
    deleteBtnText: { color: colors.dangerAlt, fontSize: 13, marginLeft: 4 },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
    cancelBtnText: { color: colors.textMuted, fontSize: 13 },
    saveBtn: { backgroundColor: colors.accent, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, marginLeft: 6 },
    saveBtnText: { color: colors.accentText, fontSize: 13, fontWeight: '600' },
  });
}