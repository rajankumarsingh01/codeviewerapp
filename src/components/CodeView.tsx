import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { readFileContent } from '../utils/fileSystem';
import { highlightToLines, getLanguageFromFileName } from '../utils/syntaxHighlighter';

interface Props {
  filePath: string;
  fileName: string;
  fontSize: number;
  highlightLine?: number | null;
}

export default function CodeView({ filePath, fileName, fontSize, highlightLine }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007ACC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.langBar}>
        <Text style={styles.langText}>{language}</Text>
        <Text style={styles.lineCountText}>{highlightedLines.length} lines</Text>
      </View>
      <ScrollView style={styles.scrollVertical} horizontal={false}>
        <ScrollView horizontal={true}>
          <View>
            {highlightedLines.map((lineTokens, index) => (
              <View
                key={index}
                style={[styles.lineRow, highlightLine === index + 1 && styles.highlightedLineRow]}
              >
                <Text style={[styles.lineNumber, { fontSize: Math.max(9, fontSize - 2) }]}>
                  {index + 1}
                </Text>
                <Text style={[styles.lineText, { fontSize }]}>
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
            ))}
          </View>
        </ScrollView>
      </ScrollView>
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
  scrollVertical: {
    flex: 1,
  },
  lineRow: {
    flexDirection: 'row',
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
});
