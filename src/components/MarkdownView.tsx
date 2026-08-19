// src/components/MarkdownView.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  Text,
  Linking,
  Image,
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { highlightToLines } from '../utils/syntaxHighlighter';

interface Props {
  content: string;
  fontSize: number;
}

// README/markdown files ko GitHub jaisa readable, formatted view me render karta hai —
// headings (with jump-to Table of Contents), bold/italic, syntax-highlighted code blocks
// (with copy button), GitHub-style alert callouts ([!NOTE]/[!TIP]/etc.), task-list
// checkboxes, smart badge-vs-content image sizing, blockquotes, tables, lists — sab
// properly styled, GitHub README jaisa "next level" preview.

// ``` ke baad likha language tag (js, py, sh, etc.) ko app ke apne syntax highlighter
// ke extension-based language detection se jodta hai
const FENCE_LANG_ALIASES: Record<string, string> = {
  js: 'js', javascript: 'js', jsx: 'jsx', mjs: 'js', cjs: 'js', node: 'js',
  ts: 'ts', typescript: 'ts', tsx: 'tsx',
  json: 'json', json5: 'json', jsonc: 'json',
  py: 'py', python: 'py', python3: 'py',
  java: 'java',
  c: 'c', h: 'c',
  cpp: 'cpp', 'c++': 'cpp', cc: 'cpp', hpp: 'cpp',
  go: 'go', golang: 'go',
  rs: 'rs', rust: 'rs',
  kt: 'kt', kotlin: 'kt',
  swift: 'swift',
  php: 'php',
  css: 'css', scss: 'scss', less: 'less',
  rb: 'rb', ruby: 'rb',
  sh: 'sh', bash: 'sh', zsh: 'sh', shell: 'sh', console: 'sh',
  yml: 'yml', yaml: 'yaml',
  html: 'html', htm: 'html',
  xml: 'xml',
  md: 'md', markdown: 'md',
};

// GitHub jaisa alert callout styling — ```> [!NOTE]``` type blockquotes ke liye
const ALERT_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  NOTE: { icon: 'information-circle', color: '#2f81f7', label: 'Note' },
  TIP: { icon: 'bulb', color: '#3fb950', label: 'Tip' },
  IMPORTANT: { icon: 'megaphone', color: '#a371f7', label: 'Important' },
  WARNING: { icon: 'warning', color: '#d29922', label: 'Warning' },
  CAUTION: { icon: 'alert-circle', color: '#f85149', label: 'Caution' },
};

// Kisi AST node ke andar se saara plain text nikalta hai (blockquote alert-type detect
// karne ke liye — jaise ki children pehle se render ho chuke React elements hote hain,
// raw AST node.children pe hi recurse karna padta hai)
function extractRawText(node: any): string {
  if (!node) return '';
  if (typeof node.content === 'string' && node.content) return node.content;
  if (Array.isArray(node.children) && node.children.length) {
    return node.children.map(extractRawText).join('');
  }
  return '';
}

// Badge jaisi chhoti images (shields.io, CI status, etc.) ko poori-width block ki jagah
// chhota inline chip jaisa dikhana — README ke top wale badges ka row mess nahi hoga
function isLikelyBadge(src: string): boolean {
  const s = src.toLowerCase();
  return (
    s.includes('shields.io') ||
    s.includes('badge') ||
    s.includes('badgen.net') ||
    s.includes('travis-ci') ||
    s.includes('codecov.io') ||
    s.includes('circleci') ||
    s.includes('/workflows/') ||
    s.includes('actions/workflows')
  );
}

function MarkdownImage({ src, alt, colors }: { src: string; alt?: string; colors: ThemeColors }) {
  const badge = isLikelyBadge(src);
  const [ratio, setRatio] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setRatio(null);
    Image.getSize(
      src,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setRatio(w / h);
      },
      () => {
        if (!cancelled) setFailed(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) {
    return (
      <View style={[imgStyles.brokenBox, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="image-outline" size={14} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, fontSize: 11, marginLeft: 6 }} numberOfLines={1}>
          {alt || 'Image load nahi ho payi'}
        </Text>
      </View>
    );
  }

  if (badge) {
    const height = 20;
    const width = ratio ? height * ratio : 90;
    return (
      <Image
        source={{ uri: src }}
        accessibilityLabel={alt}
        style={{ width, height, marginVertical: 3, marginRight: 6, borderRadius: 3 }}
        resizeMode="contain"
      />
    );
  }

  return (
    <View
      style={[
        imgStyles.contentImageWrap,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
    >
      <Image
        source={{ uri: src }}
        accessibilityLabel={alt}
        style={ratio ? { width: '100%', aspectRatio: ratio } : { width: '100%', height: 200 }}
        resizeMode="contain"
      />
    </View>
  );
}

const imgStyles = StyleSheet.create({
  contentImageWrap: {
    width: '100%',
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  brokenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginVertical: 6,
    alignSelf: 'flex-start',
  },
});

// Fenced code blocks (``` ... ```) ke liye — app ke apne VS Code-style tokenizer se
// syntax-highlighted, language label + ek-tap "Copy" button ke saath
function CodeFenceBlock({
  content,
  lang,
  colors,
  isDark,
  fontSize,
}: {
  content: string;
  lang: string;
  colors: ThemeColors;
  isDark: boolean;
  fontSize: number;
}) {
  const [copied, setCopied] = useState(false);
  const ext = FENCE_LANG_ALIASES[lang.toLowerCase()] || lang.toLowerCase() || 'txt';
  const lines = useMemo(() => highlightToLines(content, `snippet.${ext}`, isDark), [content, ext, isDark]);
  const codeFontSize = Math.max(11, fontSize - 1);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [content]);

  return (
    <View style={[fenceStyles.wrap, { borderColor: colors.border }]}>
      <View style={[fenceStyles.header, { backgroundColor: colors.surfaceAlt, borderBottomColor: colors.border }]}>
        <Text style={[fenceStyles.langLabel, { color: colors.textMuted }]} numberOfLines={1}>
          {lang ? lang.toUpperCase() : 'CODE'}
        </Text>
        <TouchableOpacity onPress={handleCopy} style={fenceStyles.copyBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={13} color={copied ? colors.success : colors.textMuted} />
          <Text style={[fenceStyles.copyText, { color: copied ? colors.success : colors.textMuted }]}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}>
        <View>
          {lines.map((tokens, i) => (
            <Text
              key={i}
              style={{ fontFamily: 'monospace', fontSize: codeFontSize, lineHeight: codeFontSize * 1.5 }}
            >
              {tokens.length === 0 ? ' ' : null}
              {tokens.map((t, j) => (
                <Text
                  key={j}
                  style={{
                    color: t.color,
                    fontStyle: t.italic ? 'italic' : 'normal',
                    fontWeight: t.bold ? '700' : '400',
                  }}
                >
                  {t.text}
                </Text>
              ))}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const fenceStyles = StyleSheet.create({
  wrap: { borderRadius: 8, marginVertical: 10, borderWidth: 1, overflow: 'hidden', backgroundColor: '#0c0c0c' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  langLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, fontFamily: 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontSize: 10.5, fontWeight: '600' },
});

export default function MarkdownView({ content, fontSize }: Props) {
  const { colors, isDark } = useTheme();
  const mdStyles = useMemo(() => createMarkdownStyles(colors, fontSize), [colors, fontSize]);
  const scrollRef = useRef<ScrollView>(null);
  const headingPositions = useRef<Record<number, number>>({});
  const headingCounterRef = useRef(0);
  const [tocOpen, setTocOpen] = useState(false);

  // Raw markdown se headings nikalke Table of Contents banao (fenced code blocks ke
  // andar wale "#" ko heading nahi maanna)
  const tocItems = useMemo(() => {
    const items: { level: number; text: string; index: number }[] = [];
    const lines = (content || '').split('\n');
    let inFence = false;
    lines.forEach((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return;
      }
      if (inFence) return;
      const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (m) items.push({ level: m[1].length, text: m[2].replace(/[*_`]/g, ''), index: items.length });
    });
    return items;
  }, [content]);

  const stats = useMemo(() => {
    const words = (content || '').trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return { words, minutes };
  }, [content]);

  // Har render pass se pehle counter reset — heading rules isi order me chalte hain
  // jis order me tocItems banaya gaya, isliye dono ka index match rehta hai
  headingCounterRef.current = 0;

  const handleLinkPress = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  const scrollToHeading = useCallback((index: number) => {
    setTocOpen(false);
    const y = headingPositions.current[index];
    if (typeof y === 'number') {
      setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true }), 80);
    }
  }, []);

  const makeHeadingRule = useCallback(
    (tagStyle: any) => (node: any, children: any) => {
      const myIndex = headingCounterRef.current;
      headingCounterRef.current += 1;
      return (
        <View
          key={node.key}
          onLayout={(e: LayoutChangeEvent) => {
            headingPositions.current[myIndex] = e.nativeEvent.layout.y;
          }}
        >
          <Text style={tagStyle}>{children}</Text>
        </View>
      );
    },
    []
  );

  const rules = useMemo(
    () => ({
      fence: (node: any) => (
        <CodeFenceBlock
          key={node.key}
          content={String(node.content).replace(/\n$/, '')}
          lang={(node.sourceInfo || '').trim().split(/\s+/)[0] || ''}
          colors={colors}
          isDark={isDark}
          fontSize={fontSize}
        />
      ),
      code_block: (node: any) => (
        <CodeFenceBlock
          key={node.key}
          content={String(node.content).replace(/\n$/, '')}
          lang=""
          colors={colors}
          isDark={isDark}
          fontSize={fontSize}
        />
      ),
      // Default image renderer (FitImage) React 19 me "key prop spread" warning deta hai,
      // isliye apna renderer — jo badges ko chhota aur content images ko aspect-ratio-aware
      // dikhata hai
      image: (node: any) => {
        const src = node?.attributes?.src;
        const alt = node?.attributes?.alt;
        if (!src) return null;
        return <MarkdownImage key={node.key} src={src} alt={alt} colors={colors} />;
      },
      heading1: makeHeadingRule(mdStyles.md.heading1),
      heading2: makeHeadingRule(mdStyles.md.heading2),
      heading3: makeHeadingRule(mdStyles.md.heading3),
      heading4: makeHeadingRule(mdStyles.md.heading4),
      heading5: makeHeadingRule(mdStyles.md.heading5),
      heading6: makeHeadingRule(mdStyles.md.heading6),
      // Task-list checkboxes ("- [ ] todo" / "- [x] done") aur GitHub alert markers
      // ("[!NOTE]" etc — jinka header blockquote rule khud render karta hai) yahan handle
      text: (node: any, _children: any, _parent: any, styles: any) => {
        const raw: string = node.content ?? '';

        const taskMatch = /^\[( |x|X)\]\s?([\s\S]*)$/.exec(raw);
        if (taskMatch) {
          const done = taskMatch[1].toLowerCase() === 'x';
          return (
            <Text key={node.key} style={styles.text}>
              <Text style={{ color: done ? colors.success : colors.textMuted, fontWeight: '700' }}>
                {done ? '☑ ' : '☐ '}
              </Text>
              <Text style={done ? { textDecorationLine: 'line-through', color: colors.textMuted } : null}>
                {taskMatch[2]}
              </Text>
            </Text>
          );
        }

        const alertMatch = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n?/i.exec(raw);
        if (alertMatch) {
          const rest = raw.slice(alertMatch[0].length);
          return rest ? (
            <Text key={node.key} style={styles.text}>
              {rest}
            </Text>
          ) : null;
        }

        return (
          <Text key={node.key} style={styles.text}>
            {raw}
          </Text>
        );
      },
      // GitHub-style alert callouts: "> [!NOTE]", "> [!TIP]", "> [!IMPORTANT]",
      // "> [!WARNING]", "> [!CAUTION]" — colored icon-header box; baaki normal blockquote
      blockquote: (node: any, children: any) => {
        const raw = extractRawText(node).trim();
        const alertMatch = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.exec(raw);

        if (alertMatch) {
          const type = alertMatch[1].toUpperCase();
          const cfg = ALERT_CONFIG[type];
          return (
            <View
              key={node.key}
              style={[mdStyles.alertBox, { borderColor: cfg.color, backgroundColor: `${cfg.color}14` }]}
            >
              <View style={mdStyles.alertHeader}>
                <Ionicons name={cfg.icon} size={15} color={cfg.color} />
                <Text style={[mdStyles.alertLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              <View>{children}</View>
            </View>
          );
        }

        return (
          <View key={node.key} style={mdStyles.md.blockquote}>
            {children}
          </View>
        );
      },
    }),
    [mdStyles, colors, isDark, fontSize, makeHeadingRule]
  );

  return (
    <View style={{ flex: 1 }}>
      {tocItems.length > 1 && (
        <View style={[mdStyles.tocBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity style={mdStyles.tocToggle} onPress={() => setTocOpen((v) => !v)} hitSlop={{ top: 6, bottom: 6 }}>
            <Ionicons name="list-outline" size={14} color={colors.accent} />
            <Text style={[mdStyles.tocToggleText, { color: colors.accent }]}>Contents ({tocItems.length})</Text>
            <Ionicons name={tocOpen ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[mdStyles.statsText, { color: colors.textFaint }]}>
            {stats.words} words · {stats.minutes} min read
          </Text>
        </View>
      )}

      {tocOpen && (
        <ScrollView
          style={[mdStyles.tocPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
        >
          {tocItems.map((item) => (
            <TouchableOpacity
              key={item.index}
              style={{ paddingVertical: 6, paddingLeft: 12 + (item.level - 1) * 14, paddingRight: 12 }}
              onPress={() => scrollToHeading(item.index)}
            >
              <Text
                style={{
                  color: item.level <= 2 ? colors.textPrimary : colors.textSecondary,
                  fontSize: item.level <= 2 ? 13.5 : 12.5,
                  fontWeight: item.level <= 2 ? '600' : '400',
                }}
                numberOfLines={1}
              >
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        ref={scrollRef}
        style={mdStyles.scroll}
        contentContainerStyle={mdStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <Markdown style={mdStyles.md} rules={rules} onLinkPress={handleLinkPress}>
          {content && content.trim().length > 0 ? content : '_(Ye file khaali hai)_'}
        </Markdown>
      </ScrollView>
    </View>
  );
}

function createMarkdownStyles(colors: ThemeColors, fontSize: number) {
  const bodySize = fontSize;

  return {
    scroll: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 60 },
    tocBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    tocToggle: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 },
    tocToggleText: { fontSize: 12, fontWeight: '700' as const },
    statsText: { fontSize: 10.5 },
    tocPanel: { maxHeight: 220, borderBottomWidth: 1 },
    alertBox: {
      borderWidth: 1,
      borderLeftWidth: 4,
      borderRadius: 6,
      padding: 12,
      marginVertical: 12,
    },
    alertHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 6 },
    alertLabel: { fontWeight: '700' as const, fontSize: 13 },
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