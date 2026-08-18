// Halka custom syntax highlighter — koi native/heavy library nahi.
// Pure regex-based tokenizer, VS Code "Dark+" theme ke colors follow karta hai.
// Expo Go me 100% chalega kyunki ye sirf plain JS hai, native module nahi.

export interface Token {
  text: string;
  color: string;
  bold?: boolean;
  italic?: boolean;
}

// VS Code "Dark+" theme ke approximate colors
export const SYNTAX_COLORS = {
  keyword: '#569CD6', // const, if, for, class, return...
  controlKeyword: '#C586C0', // import, export, from, default, as
  string: '#CE9178', // "text", 'text', `text`
  comment: '#6A9955', // // ... aur /* ... */
  number: '#B5CEA1', // 123, 3.14
  boolean: '#569CD6', // true, false, null, undefined
  function: '#DCDCAA', // functionName(
  variable: '#9CDCFE', // normal identifiers
  type: '#4EC9B0', // CapitalizedNames (classes/types)
  punctuation: '#D4D4D4', // { } ( ) ; , . etc
  default: '#D4D4D4',
  tag: '#569CD6', // JSX/HTML tags
  attribute: '#9CDCFE', // JSX/HTML attributes
};

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

// Language -> comment style mapping
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
    parts.push(`(${escapeRegex(open)}[\\s\\S]*?${escapeRegex(close)})`); // block comment
  } else {
    parts.push('(a^)'); // never matches placeholder
  }

  if (config.lineComment) {
    parts.push(`(${escapeRegex(config.lineComment)}[^\\n]*)`); // line comment
  } else {
    parts.push('(a^)');
  }

  parts.push('(`(?:\\\\[\\s\\S]|\\$\\{[^}]*\\}|[^`\\\\])*`)'); // template string
  parts.push('("(?:\\\\.|[^"\\\\\\n])*")'); // double-quoted string
  parts.push("('(?:\\\\.|[^'\\\\\\n])*')"); // single-quoted string
  parts.push('(\\b\\d+\\.?\\d*\\b)'); // numbers
  parts.push('(\\b[a-zA-Z_$][\\w$]*\\b)'); // identifiers
  parts.push('(\\n)'); // newline

  return new RegExp(parts.join('|'), 'g');
}

const regexCache: Record<string, RegExp> = {};

function tokenizeLine(code: string, lang: string): Token[] {
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
      tokens.push({ text: code.slice(lastIndex, match.index), color: SYNTAX_COLORS.default });
    }

    const [full, blockComment, lineComment, template, dstring, sstring, number, ident, newline] = match;

    if (blockComment || lineComment) {
      tokens.push({ text: full, color: SYNTAX_COLORS.comment, italic: true });
    } else if (template || dstring || sstring) {
      tokens.push({ text: full, color: SYNTAX_COLORS.string });
    } else if (number) {
      tokens.push({ text: full, color: SYNTAX_COLORS.number });
    } else if (newline) {
      tokens.push({ text: '\n', color: SYNTAX_COLORS.default });
    } else if (ident) {
      if (CONTROL_KEYWORDS.has(ident)) {
        tokens.push({ text: full, color: SYNTAX_COLORS.controlKeyword });
      } else if (KEYWORDS.has(ident)) {
        tokens.push({ text: full, color: SYNTAX_COLORS.keyword });
      } else if (BOOL_NULL.has(ident)) {
        tokens.push({ text: full, color: SYNTAX_COLORS.boolean });
      } else {
        const after = code.slice(regex.lastIndex, regex.lastIndex + 5);
        if (/^\s*\(/.test(after)) {
          tokens.push({ text: full, color: SYNTAX_COLORS.function });
        } else if (/^[A-Z]/.test(ident)) {
          tokens.push({ text: full, color: SYNTAX_COLORS.type });
        } else {
          tokens.push({ text: full, color: SYNTAX_COLORS.variable });
        }
      }
    }

    lastIndex = regex.lastIndex;
    // Safety: avoid infinite loop on zero-length matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), color: SYNTAX_COLORS.default });
  }

  return tokens;
}

// Poori file ka content leke, har line ke liye colored tokens ka array deta hai
export function highlightToLines(code: string, fileName: string): Token[][] {
  const lang = getLanguageFromFileName(fileName);
  const tokens = tokenizeLine(code, lang);

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