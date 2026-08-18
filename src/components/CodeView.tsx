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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { readFileContent } from '../utils/fileSystem';
import { highlightToLines, getLanguageFromFileName, Token } from '../utils/syntaxHighlighter';

interface Props {
  filePath: string;
  fileName: string;
  fontSize: number;
  highlightLine?: number | null;
  wordWrap: boolean;
}

export default function CodeView({ filePath, fileName, fontSize, highlightLine, wordWrap }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setContent(null);
    readFileContent(filePath).then((text) => {
      if (!cancelled) {
        setContent(text);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  // Content change hone par hi dobara tokenize karo, har render pe nahi
  const highlightedLines = useMemo(() => {
    if (!content) return [];
    return highlightToLines(content, fileName);
  }, [content, fileName]);

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
    return Math.max(screenWidth, 44 + maxLen * charWidth + 40);
  }, [highlightedLines, fontSize, screenWidth]);

  const handleCopyFile = useCallback(async () => {
    if (!content) return;
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [content]);

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
    ({ item: lineTokens, index }: { item: Token[]; index: number }) => (
      <View
        style={[
          wordWrap ? styles.lineRowWrap : styles.lineRow,
          !wordWrap && { height: ROW_HEIGHT },
          highlightLine === index + 1 && styles.highlightedLineRow,
        ]}
      >
        <Text
          style={[
            styles.lineNumber,
            { fontSize: Math.max(9, fontSize - 2) },
            !wordWrap && { lineHeight: ROW_HEIGHT },
          ]}
        >
          {index + 1}
        </Text>
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
    ),
    [fontSize, highlightLine, ROW_HEIGHT, wordWrap]
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
        </View>
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
      </View>

      {wordWrap ? (
        listElement
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          {listElement}
        </ScrollView>
      )}
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
  lineNumber: {
    width: 44,
    textAlign: 'right',
    paddingRight: 10,
    color: '#5A5A5A',
    fontFamily: 'monospace',
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