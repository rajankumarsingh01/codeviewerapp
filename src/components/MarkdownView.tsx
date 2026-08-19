import React, { useCallback, useMemo } from 'react';
import { ScrollView, Text, Linking, Image } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme, ThemeColors } from '../context/ThemeContext';

interface Props {
  content: string;
  fontSize: number;
}

// README/markdown files ko GitHub jaisa readable, formatted view me render karta hai —
// headings, bold/italic, code blocks, blockquotes, tables, lists sab properly styled.
export default function MarkdownView({ content, fontSize }: Props) {
  const { colors } = useTheme();
  const mdStyles = useMemo(() => createMarkdownStyles(colors, fontSize), [colors, fontSize]);

  // Link tap hone par device ke browser me khol do
  const handleLinkPress = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  // Code blocks (``` ... ```) ke liye custom rule — horizontal scroll taaki lambi lines cut na ho
  const rules = useMemo(
    () => ({
      fence: (node: any) => (
        <ScrollView
          key={node.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={mdStyles.fenceWrap}
          contentContainerStyle={mdStyles.fenceContent}
        >
          <Text style={mdStyles.fenceText}>{String(node.content).replace(/\n$/, '')}</Text>
        </ScrollView>
      ),
      code_block: (node: any) => (
        <ScrollView
          key={node.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={mdStyles.fenceWrap}
          contentContainerStyle={mdStyles.fenceContent}
        >
          <Text style={mdStyles.fenceText}>{String(node.content).replace(/\n$/, '')}</Text>
        </ScrollView>
      ),
      // Default image renderer (FitImage) React 19 me "key prop spread" warning deta hai —
      // isliye apna simple Image renderer use karo taaki wo warning na aaye
      image: (node: any) => {
        const src = node?.attributes?.src;
        const alt = node?.attributes?.alt;
        if (!src) return null;
        return (
          <Image
            key={node.key}
            source={{ uri: src }}
            accessibilityLabel={alt}
            style={mdStyles.image}
            resizeMode="contain"
          />
        );
      },
    }),
    [mdStyles]
  );

  return (
    <ScrollView
      style={mdStyles.scroll}
      contentContainerStyle={mdStyles.content}
      showsVerticalScrollIndicator={false}
    >
      <Markdown style={mdStyles.md} rules={rules} onLinkPress={handleLinkPress}>
        {content && content.trim().length > 0 ? content : '_(Ye file khaali hai)_'}
      </Markdown>
    </ScrollView>
  );
}

function createMarkdownStyles(colors: ThemeColors, fontSize: number) {
  const bodySize = fontSize;

  return {
    scroll: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 60 },
    fenceWrap: {
      backgroundColor: '#0c0c0c',
      borderRadius: 8,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fenceContent: { padding: 12 },
    fenceText: {
      color: '#d4d4d4',
      fontFamily: 'monospace',
      fontSize: Math.max(11, bodySize - 1),
      lineHeight: Math.max(11, bodySize - 1) * 1.5,
    },
    image: {
      width: '100%' as const,
      height: 200,
      borderRadius: 8,
      marginVertical: 10,
      backgroundColor: colors.surfaceAlt,
    },
    md: {
      body: {
        color: colors.textPrimary,
        fontSize: bodySize,
        lineHeight: bodySize * 1.65,
      },
      heading1: {
        fontSize: bodySize + 14,
        fontWeight: '700',
        color: colors.textPrimary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 8,
        marginTop: 4,
        marginBottom: 14,
      },
      heading2: {
        fontSize: bodySize + 9,
        fontWeight: '700',
        color: colors.textPrimary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 6,
        marginTop: 24,
        marginBottom: 12,
      },
      heading3: {
        fontSize: bodySize + 6,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 20,
        marginBottom: 10,
      },
      heading4: {
        fontSize: bodySize + 3,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
      },
      heading5: {
        fontSize: bodySize + 1,
        fontWeight: '700',
        color: colors.textSecondary,
        marginTop: 14,
        marginBottom: 6,
      },
      heading6: {
        fontSize: bodySize,
        fontWeight: '700',
        color: colors.textMuted,
        marginTop: 14,
        marginBottom: 6,
      },
      paragraph: { marginTop: 0, marginBottom: 14 },
      strong: { fontWeight: '700', color: colors.textPrimary },
      em: { fontStyle: 'italic' },
      s: { textDecorationLine: 'line-through' },
      link: { color: colors.accent, textDecorationLine: 'underline' },
      blockquote: {
        backgroundColor: colors.surfaceAlt,
        borderLeftWidth: 4,
        borderLeftColor: colors.accent,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginVertical: 12,
        borderRadius: 4,
      },
      code_inline: {
        backgroundColor: colors.inputBg,
        color: colors.warning,
        fontFamily: 'monospace',
        fontSize: Math.max(11, bodySize - 1),
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
      },
      bullet_list: { marginVertical: 6 },
      ordered_list: { marginVertical: 6 },
      list_item: { flexDirection: 'row', marginBottom: 6 },
      bullet_list_icon: { color: colors.accent, marginRight: 8, fontSize: bodySize },
      bullet_list_content: { flex: 1, color: colors.textPrimary, fontSize: bodySize },
      ordered_list_icon: {
        color: colors.accent,
        marginRight: 8,
        fontSize: bodySize,
        fontWeight: '600',
      },
      ordered_list_content: { flex: 1, color: colors.textPrimary, fontSize: bodySize },
      hr: { backgroundColor: colors.border, height: 1, marginVertical: 20 },
      table: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        marginVertical: 14,
        overflow: 'hidden',
      },
      thead: { backgroundColor: colors.surfaceAlt },
      th: {
        padding: 8,
        fontWeight: '700',
        color: colors.textPrimary,
        borderColor: colors.border,
      },
      tr: { borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row' },
      td: { padding: 8, color: colors.textSecondary, borderColor: colors.border },
    } as any,
  };
}