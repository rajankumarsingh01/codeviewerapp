// Halka custom syntax highlighter — koi native/heavy library nahi.
// Pure regex-based tokenizer. Dono themes (VS Code Dark+ aur Light+) ke colors support karta hai.
// Expo Go me 100% chalega kyunki ye sirf plain JS hai, native module nahi.

export interface Token {
  text: string;
  color: string;
  bold?: boolean;
  italic?: boolean;
}

interface SyntaxColorSet {
  keyword: string;
  controlKeyword: string;
  string: string;
  comment: string;
  number: string;
  boolean: string;
  function: string;
  variable: string;
  type: string;
  punctuation: string;
  default: string;
  tag: string;
  attribute: string;
}

// VS Code "Dark+" theme ke approximate colors
export const DARK_SYNTAX_COLORS: SyntaxColorSet = {
  keyword: '#569CD6',
  controlKeyword: '#C586C0',
  string: '#CE9178',
  comment: '#6A9955',
  number: '#B5CEA1',
  boolean: '#569CD6',
  function: '#DCDCAA',
  variable: '#9CDCFE',
  type: '#4EC9B0',
  punctuation: '#D4D4D4',
  default: '#D4D4D4',
  tag: '#569CD6',
  attribute: '#9CDCFE',
};

// VS Code "Light+" theme ke approximate colors
export const LIGHT_SYNTAX_COLORS: SyntaxColorSet = {
  keyword: '#0000FF',
  controlKeyword: '#AF00DB',
  string: '#A31515',
  comment: '#008000',
  number: '#098658',
  boolean: '#0000FF',
  function: '#795E26',
  variable: '#001080',
  type: '#267F99',
  punctuation: '#000000',
  default: '#000000',
  tag: '#800000',
  attribute: '#FF0000',
};

export function getSyntaxColors(isDark: boolean): SyntaxColorSet {
  return isDark ? DARK_SYNTAX_COLORS : LIGHT_SYNTAX_COLORS;
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'new',
  'try', 'catch', 'finally', 'async', 'await', 'typeof', 'instanceof', 'in',
  'of', 'yield', 'static', 'get', 'set', 'throw', 'delete', 'void', 'this',
  'super', 'interface', 'type', 'enum', 'implements', 'public', 'private',
  'protected', 'readonly', 'abstract', 'namespace', 'declare', 'module',
  // Python
  'def', 'elif', 'except', 'pass', 'lambda', 'with', 'as', 'raise', 'global',
  'nonlocal', 'import', 'from', 'not', 'and', 'or', 'is', 'None', 'True',
  'False', 'self', 'print',
  // Java/C family extras
  'final', 'void', 'int', 'string', 'bool',
  'struct', 'template', 'package',
]);

const CONTROL_KEYWORDS = new Set(['import', 'export', 'from', 'default', 'as']);
const BOOL_NULL = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'None', 'True', 'False']);

interface LangConfig {
  lineComment: string | null;
  blockComment: [string, string] | null;
}

const LANG_CONFIG: Record<string, LangConfig> = {
  javascript: { lineComment: '//', blockComment: ['/*', '*/'] },
  typescript: { lineComment: '//', blockComment: ['/*', '*/'] },
  json: { lineComment: null, blockComment: null },
  java: { lineComment: '//', blockComment: ['/*', '*/'] },
  c: { lineComment: '//', blockComment: ['/*', '*/'] },
  cpp: { lineComment: '//', blockComment: ['/*', '*/'] },
  go: { lineComment: '//', blockComment: ['/*', '*/'] },
  rust: { lineComment: '//', blockComment: ['/*', '*/'] },
  kotlin: { lineComment: '//', blockComment: ['/*', '*/'] },
  swift: { lineComment: '//', blockComment: ['/*', '*/'] },
  php: { lineComment: '//', blockComment: ['/*', '*/'] },
  css: { lineComment: null, blockComment: ['/*', '*/'] },
  python: { lineComment: '#', blockComment: null },
  ruby: { lineComment: '#', blockComment: null },
  bash: { lineComment: '#', blockComment: null },
  yaml: { lineComment: '#', blockComment: null },
  html: { lineComment: null, blockComment: ['<!--', '-->'] },
  xml: { lineComment: null, blockComment: ['<!--', '-->'] },
  markdown: { lineComment: null, blockComment: null },
  plaintext: { lineComment: null, blockComment: null },
};

export function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    json: 'json',
    py: 'python',
    java: 'java',
    c: 'c', h: 'c',
    cpp: 'cpp', cc: 'cpp', hpp: 'cpp',
    go: 'go',
    rs: 'rust',
    kt: 'kotlin', kts: 'kotlin',
    swift: 'swift',
    php: 'php',
    css: 'css', scss: 'css', less: 'css',
    rb: 'ruby',
    sh: 'bash', bash: 'bash', zsh: 'bash',
    yml: 'yaml', yaml: 'yaml',
    html: 'html', htm: 'html',
    xml: 'xml',
    md: 'markdown', markdown: 'markdown',
  };
  return map[ext] || 'plaintext';
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTokenRegex(lang: string): RegExp {
  const config = LANG_CONFIG[lang] || LANG_CONFIG.plaintext;
  const parts: string[] = [];

  if (config.blockComment) {
    const [open, close] = config.blockComment;
    parts.push(`(${escapeRegex(open)}[\\s\\S]*?${escapeRegex(close)})`);
  } else {
    parts.push('(a^)');
  }

  if (config.lineComment) {
    parts.push(`(${escapeRegex(config.lineComment)}[^\\n]*)`);
  } else {
    parts.push('(a^)');
  }

  parts.push('(`(?:\\\\[\\s\\S]|\\$\\{[^}]*\\}|[^`\\\\])*`)');
  parts.push('("(?:\\\\.|[^"\\\\\\n])*")');
  parts.push("('(?:\\\\.|[^'\\\\\\n])*')");
  parts.push('(\\b\\d+\\.?\\d*\\b)');
  parts.push('(\\b[a-zA-Z_$][\\w$]*\\b)');
  parts.push('(\\n)');

  return new RegExp(parts.join('|'), 'g');
}

const regexCache: Record<string, RegExp> = {};

function tokenizeLine(code: string, lang: string, colors: SyntaxColorSet): Token[] {
  if (!regexCache[lang]) {
    regexCache[lang] = buildTokenRegex(lang);
  }
  const regex = regexCache[lang];
  regex.lastIndex = 0;

  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index), color: colors.default });
    }

    const [full, blockComment, lineComment, template, dstring, sstring, number, ident, newline] = match;

    if (blockComment || lineComment) {
      tokens.push({ text: full, color: colors.comment, italic: true });
    } else if (template || dstring || sstring) {
      tokens.push({ text: full, color: colors.string });
    } else if (number) {
      tokens.push({ text: full, color: colors.number });
    } else if (newline) {
      tokens.push({ text: '\n', color: colors.default });
    } else if (ident) {
      if (CONTROL_KEYWORDS.has(ident)) {
        tokens.push({ text: full, color: colors.controlKeyword });
      } else if (KEYWORDS.has(ident)) {
        tokens.push({ text: full, color: colors.keyword });
      } else if (BOOL_NULL.has(ident)) {
        tokens.push({ text: full, color: colors.boolean });
      } else {
        const after = code.slice(regex.lastIndex, regex.lastIndex + 5);
        if (/^\s*\(/.test(after)) {
          tokens.push({ text: full, color: colors.function });
        } else if (/^[A-Z]/.test(ident)) {
          tokens.push({ text: full, color: colors.type });
        } else {
          tokens.push({ text: full, color: colors.variable });
        }
      }
    }

    lastIndex = regex.lastIndex;
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), color: colors.default });
  }

  return tokens;
}

// Poori file ka content leke, har line ke liye colored tokens ka array deta hai.
// isDark: true -> Dark+ colors, false -> Light+ colors
export function highlightToLines(code: string, fileName: string, isDark: boolean = true): Token[][] {
  const lang = getLanguageFromFileName(fileName);
  const colors = getSyntaxColors(isDark);
  const tokens = tokenizeLine(code, lang, colors);

  const lines: Token[][] = [[]];
  for (const tok of tokens) {
    const segments = tok.text.split('\n');
    segments.forEach((segment, i) => {
      if (i > 0) {
        lines.push([]);
      }
      if (segment.length > 0) {
        lines[lines.length - 1].push({ ...tok, text: segment });
      }
    });
  }

  return lines;
}