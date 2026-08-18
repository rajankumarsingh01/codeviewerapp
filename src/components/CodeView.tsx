import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { readFileContent } from '../utils/fileSystem';
import { highlightToLines, getLanguageFromFileName, Token } from '../utils/syntaxHighlighter';
import {
  getLineNotes,
  saveLineNote,
  deleteLineNote,
  LineNotesMap,
  getEditedContent,
  saveEditedContent,
  discardEditedContent,
} from '../utils/notesStorage';
import LineCommentModal from './LineCommentModal';

interface Props {
  filePath: string;
  fileName: string;
  fontSize: number;
  highlightLine?: number | null;
  wordWrap: boolean;
}

const COMMENT_GUTTER_WIDTH = 22;

export default function CodeView({ filePath, fileName, fontSize, highlightLine, wordWrap }: Props) {
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Phase 9b — is file ke saare line-level comments { lineNumber: text }
  const [lineNotes, setLineNotes] = useState<LineNotesMap>({});
  const [activeCommentLine, setActiveCommentLine] = useState<number | null>(null);

  // Phase 9c — actual file editing (local overlay). null = koi saved edit nahi, original dikhega.
  const [editedOverride, setEditedOverride] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOriginalContent(null);
    readFileContent(filePath).then((text) => {
      if (!cancelled) {
        setOriginalContent(text);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  // File badalte hi uske line-comments alag se load karo (content load se independent)
  useEffect(() => {
    let cancelled = false;
    setLineNotes({});
    getLineNotes(filePath).then((notes) => {
      if (!cancelled) setLineNotes(notes);
    });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  // File badalte hi uska saved edited overlay (agar hai) load karo
  useEffect(() => {
    let cancelled = false;
    setEditing(false);
    setEditedOverride(null);
    getEditedContent(filePath).then((val) => {
      if (!cancelled) setEditedOverride(val);
    });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  // Jo dikhana hai: agar edited overlay saved hai to wahi, warna original file content
  const displayContent = editedOverride ?? originalContent;

  const handleLinePress = useCallback((lineNumber: number) => {
    setActiveCommentLine(lineNumber);
  }, []);

  const handleSaveLineComment = useCallback(
    async (text: string) => {
      if (activeCommentLine == null) return;
      const updated = await saveLineNote(filePath, activeCommentLine, text);
      setLineNotes(updated);
      setActiveCommentLine(null);
    },
    [filePath, activeCommentLine]
  );

  const handleDeleteLineComment = useCallback(async () => {
    if (activeCommentLine == null) return;
    const updated = await deleteLineNote(filePath, activeCommentLine);
    setLineNotes(updated);
    setActiveCommentLine(null);
  }, [filePath, activeCommentLine]);

  const handleEnterEdit = useCallback(() => {
    setDraftText(displayContent ?? '');
    setEditing(true);
  }, [displayContent]);

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    setSavingEdit(true);
    await saveEditedContent(filePath, draftText);
    setEditedOverride(draftText);
    setSavingEdit(false);
    setEditing(false);
  }, [filePath, draftText]);

  const handleResetToOriginal = useCallback(() => {
    Alert.alert(
      'Original par reset karein?',
      'Aapke is file ke saare edits hat jayenge, original content wapas aa jayega. Ye undo nahi ho sakta.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await discardEditedContent(filePath);
            setEditedOverride(null);
            setEditing(false);
          },
        },
      ]
    );
  }, [filePath]);

  // Content change hone par hi dobara tokenize karo, har render pe nahi
  const highlightedLines = useMemo(() => {
    if (!displayContent) return [];
    return highlightToLines(displayContent, fileName);
  }, [displayContent, fileName]);

  const language = useMemo(() => getLanguageFromFileName(fileName), [fileName]);

  // Non-wrap mode me har line ki fixed height taaki FlatList ko getItemLayout mil sake
  const ROW_HEIGHT = fontSize + 10;

  // Sabse lambi line ke hisaab se horizontal content width nikalo (sirf non-wrap mode me chahiye)
  const screenWidth = Dimensions.get('window').width;
  const contentWidth = useMemo(() => {
    const charWidth = fontSize * 0.62; // monospace ke liye approx ratio
    let maxLen = 0;
    for (const line of highlightedLines) {
      let len = 0;
      for (const t of line) len += t.text.length;
      if (len > maxLen) maxLen = len;
    }
    return Math.max(screenWidth, COMMENT_GUTTER_WIDTH + 44 + maxLen * charWidth + 40);
  }, [highlightedLines, fontSize, screenWidth]);

  const handleCopyFile = useCallback(async () => {
    if (!displayContent) return;
    await Clipboard.setStringAsync(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [displayContent]);

  const listRef = useRef<FlatList<Token[]>>(null);

  // Search se koi specific line pe jump kiya gaya ho to us line tak auto-scroll karo
  useEffect(() => {
    if (highlightLine == null || !listRef.current) return;
    const index = highlightLine - 1;
    if (index < 0 || index >= highlightedLines.length) return;
    const timeout = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    }, 50);
    return () => clearTimeout(timeout);
  }, [highlightLine, highlightedLines.length]);

  const renderItem = useCallback(
    ({ item: lineTokens, index }: { item: Token[]; index: number }) => {
      const lineNumber = index + 1;
      const hasComment = !!lineNotes[lineNumber]?.trim();
      return (
        <View
          style={[
            wordWrap ? styles.lineRowWrap : styles.lineRow,
            !wordWrap && { height: ROW_HEIGHT },
            highlightLine === lineNumber && styles.highlightedLineRow,
          ]}
        >
          <TouchableOpacity
            onPress={() => handleLinePress(lineNumber)}
            style={[styles.commentGutter, !wordWrap && { height: ROW_HEIGHT }]}
            hitSlop={{ top: 2, bottom: 2, left: 4, right: 4 }}
          >
            {hasComment && <Ionicons name="chatbubble" size={10} color="#DCDCAA" />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleLinePress(lineNumber)}
            hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
          >
            <Text
              style={[
                styles.lineNumber,
                { fontSize: Math.max(9, fontSize - 2) },
                !wordWrap && { lineHeight: ROW_HEIGHT },
                hasComment && styles.lineNumberWithComment,
              ]}
            >
              {lineNumber}
            </Text>
          </TouchableOpacity>
          <Text
            style={[
              wordWrap ? styles.lineTextWrap : styles.lineText,
              { fontSize },
              !wordWrap && { lineHeight: ROW_HEIGHT },
            ]}
          >
            {lineTokens.length === 0 ? (
              ' '
            ) : (
              lineTokens.map((token, tokenIndex) => (
                <Text
                  key={tokenIndex}
                  style={{
                    color: token.color,
                    fontStyle: token.italic ? 'italic' : 'normal',
                    fontWeight: token.bold ? 'bold' : 'normal',
                  }}
                >
                  {token.text}
                </Text>
              ))
            )}
          </Text>
        </View>
      );
    },
    [fontSize, highlightLine, ROW_HEIGHT, wordWrap, lineNotes, handleLinePress]
  );

  const getItemLayout = useCallback(
    (_: Token[][] | null | undefined, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    [ROW_HEIGHT]
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007ACC" />
      </View>
    );
  }

  const listElement = (
    <FlatList
      ref={listRef}
      data={highlightedLines}
      keyExtractor={(_, index) => String(index)}
      renderItem={renderItem}
      // Wrap mode me lines ki height variable hoti hai, isliye fixed getItemLayout use nahi kar sakte
      getItemLayout={wordWrap ? undefined : getItemLayout}
      style={wordWrap ? styles.flatListWrap : { width: contentWidth }}
      initialNumToRender={50}
      maxToRenderPerBatch={40}
      windowSize={12}
      removeClippedSubviews={true}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        }, 100);
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.langBar}>
        <View style={styles.langBarLeft}>
          <Text style={styles.langText}>{language}</Text>
          <Text style={styles.lineCountText}>{highlightedLines.length} lines</Text>
          {editedOverride !== null && !editing && (
            <View style={styles.editedBadge}>
              <Text style={styles.editedBadgeText}>Edited</Text>
            </View>
          )}
        </View>

        <View style={styles.langBarRight}>
          {editing ? (
            <>
              {editedOverride !== null && (
                <TouchableOpacity
                  style={styles.editActionBtn}
                  onPress={handleResetToOriginal}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="refresh-outline" size={14} color="#F14C4C" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.editActionBtn}
                onPress={handleCancelEdit}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveEditBtn}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                <Ionicons name="checkmark" size={14} color="#ffffff" />
                <Text style={styles.saveEditBtnText}>{savingEdit ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={handleEnterEdit}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="pencil-outline" size={13} color="#cccccc" />
                <Text style={styles.copyBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={handleCopyFile}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={14}
                  color={copied ? '#4EC9B0' : '#cccccc'}
                />
                <Text style={[styles.copyBtnText, copied && { color: '#4EC9B0' }]}>
                  {copied ? 'Copied!' : 'Copy File'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {editing ? (
        <TextInput
          style={styles.editInput}
          multiline
          autoFocus
          value={draftText}
          onChangeText={setDraftText}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
      ) : wordWrap ? (
        listElement
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          {listElement}
        </ScrollView>
      )}

      <LineCommentModal
        visible={activeCommentLine != null}
        lineNumber={activeCommentLine}
        initialText={activeCommentLine != null ? lineNotes[activeCommentLine] || '' : ''}
        onSave={handleSaveLineComment}
        onDelete={handleDeleteLineComment}
        onClose={() => setActiveCommentLine(null)}
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
  langBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  langBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editedBadge: {
    backgroundColor: '#3a3d1e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editedBadgeText: {
    color: '#DCDCAA',
    fontSize: 10,
    fontWeight: '600',
  },
  langText: {
    color: '#858585',
    fontSize: 12,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lineCountText: {
    color: '#858585',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#3c3c3c',
  },
  copyBtnText: {
    color: '#cccccc',
    fontSize: 12,
    marginLeft: 5,
  },
  editActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cancelText: {
    color: '#858585',
    fontSize: 12,
  },
  saveEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: '#007ACC',
  },
  saveEditBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  editInput: {
    flex: 1,
    color: '#D4D4D4',
    fontFamily: 'monospace',
    fontSize: 14,
    padding: 14,
    lineHeight: 20,
    backgroundColor: '#1e1e1e',
  },
  flatListWrap: {
    flex: 1,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineRowWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  highlightedLineRow: {
    backgroundColor: '#2a2d3d',
  },
  commentGutter: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineNumber: {
    width: 44,
    textAlign: 'right',
    paddingRight: 10,
    color: '#5A5A5A',
    fontFamily: 'monospace',
  },
  lineNumberWithComment: {
    color: '#DCDCAA',
  },
  lineText: {
    color: '#D4D4D4',
    fontFamily: 'monospace',
    paddingRight: 24,
  },
  lineTextWrap: {
    color: '#D4D4D4',
    fontFamily: 'monospace',
    flex: 1,
    flexWrap: 'wrap',
    paddingRight: 14,
  },
});