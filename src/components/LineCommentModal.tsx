import React, { useEffect, useState } from 'react';
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

interface Props {
  visible: boolean;
  lineNumber: number | null;
  initialText: string;
  onSave: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

// Bottom-sheet style modal — kisi bhi line pe tap karke chhota comment add/edit/remove karne ke liye
export default function LineCommentModal({
  visible,
  lineNumber,
  initialText,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [text, setText] = useState(initialText);

  // Jab bhi naya line select ho ya modal dobara khule, text ko us line ke saved comment se reset karo
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
            <Ionicons name="chatbubble-outline" size={14} color="#DCDCAA" />
            <Text style={styles.headerText}>Line {lineNumber ?? ''} pe comment</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color="#858585" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            multiline
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder="Is line ke baare me chhota note likho..."
            placeholderTextColor="#5a5a5a"
            textAlignVertical="top"
          />

          <View style={styles.footer}>
            {initialText.trim().length > 0 && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8 }}>
                <Ionicons name="trash-outline" size={14} color="#F14C4C" />
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#252526',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: '#3c3c3c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3c3c3c',
    color: '#D4D4D4',
    fontSize: 14,
    padding: 10,
    minHeight: 90,
    maxHeight: 180,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#F14C4C',
    fontSize: 13,
    marginLeft: 4,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    color: '#858585',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#007ACC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});