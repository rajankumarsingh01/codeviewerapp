<div align="center">

# 📱 CodeViewer

### A VS Code-style mobile companion for reading, understanding & annotating your projects — right from your phone.

[![Made with Expo](https://img.shields.io/badge/Made%20with-Expo-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-blue?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#-license)

**No backend. No server. 100% offline. Your code never leaves your phone.**

</div>

---

## 🧠 Why CodeViewer?

Ever wanted to review your project, copy a file's code to paste into ChatGPT/Claude for help, or just re-read your own logic — but you were away from your laptop? **CodeViewer** turns your phone into a lightweight, VS Code-style project reader.

Import a project as a `.zip`, or clone straight from a public GitHub URL, and instantly get a full VS Code-like experience: folder tree, syntax-highlighted code, tabs, split view, bookmarks, personal notes, and a GitHub-quality Markdown/README preview — all running locally, with zero backend.

---

## ✨ Features

### 📂 Project Management
- **Import a project as `.zip`** — auto-extracted locally on-device (via JSZip)
- **Clone directly from GitHub** — paste a public repo URL and watch a terminal-style live clone log (uses GitHub's codeload zip endpoint under the hood, since Expo Go has no native `git` binary)
- **Recent projects & quick reopen** with "last opened" timestamps
- Delete a project (auto-cleans its notes, line-comments, and edited content too)

### 🌲 VS Code-Style Explorer
- Full folder tree navigation with collapse/expand
- File search across the entire project
- Project stats — file counts, word counts
- Bookmarks for frequently visited files
- Recent files list for fast jump-back

### 🖥️ Code Viewer
- Custom **lightweight regex-based syntax highlighter** (no native modules — 100% Expo Go compatible)
- Supports JS/TS/JSX/TSX, Python, Java, C/C++, Go, Rust, Kotlin, Swift, PHP, Ruby, HTML/CSS, JSON, YAML, Bash & more
- Adjustable zoom / font size (6px–24px)
- One-tap **copy file** or **copy selected text**
- **Tabs + Split View** — open multiple files side-by-side
- Dark+ / Light+ theme, matching VS Code's default look

### 📝 Notes & Personal Annotations
- Add **personal notes per file** — a separate overlay layer, your original files stay untouched
- **Line-level comments** on any specific line of code
- Locally edit file content if needed (saved via `AsyncStorage`, never touches the actual imported files)
- Export all notes

### 📖 Professional Markdown Preview
A **GitHub README-grade** renderer for your `.md` files — not just plain text dump:
- Auto-generated **Table of Contents** with jump-to-heading
- Word count & estimated reading time
- GitHub-style **alert callouts** (`> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`) with soft, eye-friendly accent colors
- Syntax-highlighted fenced code blocks with a one-tap **Copy** button
- Smart image handling — badges (shields.io/CI) render as small inline chips, content images render full-width with correct aspect ratio
- Task-list checkboxes (`- [ ] todo`, `- [x] done`)
- Clean tables, blockquotes, and nested lists
- A carefully tuned **Palenight-inspired color palette** for code blocks — soft purples, greens, and golds instead of harsh neon blue, so long reading sessions don't strain your eyes

### 🎨 Theming
- One-tap Dark / Light mode toggle, persisted across sessions
- Consistent, VS Code-accurate color system across every screen

### 🔒 Privacy by Design
- **No backend, no account, no analytics.** Everything — your imported projects, notes, bookmarks — lives entirely in local device storage.
- Internet is used only once: during the initial GitHub clone or Expo setup.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) (Managed Workflow) |
| UI | React Native `0.81`, React `19` |
| Language | TypeScript |
| Navigation | React Navigation (Native Stack) |
| Local Storage | `@react-native-async-storage/async-storage` |
| Zip Handling | JSZip |
| File Picker | `expo-document-picker` |
| Markdown Rendering | `react-native-markdown-display` |
| Syntax Highlighting | Custom in-house regex tokenizer (no native deps) |
| Icons | `@expo/vector-icons` (Ionicons) |
| Build/Deploy | EAS Build (Android APK / App Bundle) |

---

## 📁 Project Structure
CodeViewer/
├── App.tsx # Navigation root
├── index.ts # Entry point
├── app.json # Expo app config
├── eas.json # EAS build profiles
├── src/
│ ├── components/
│ │ ├── ActivityBar.tsx # Left icon rail (explorer/search/notes/etc.)
│ │ ├── Sidebar.tsx # File tree + search + bookmarks panel
│ │ ├── TreeItem.tsx # Single folder/file row in the tree
│ │ ├── TabBar.tsx # Open-file tabs
│ │ ├── EditorPane.tsx # Code/Markdown/Notes pane switcher
│ │ ├── CodeView.tsx # Syntax-highlighted code renderer
│ │ ├── MarkdownView.tsx # GitHub-style Markdown/README preview
│ │ ├── NotesView.tsx # Per-file personal notes
│ │ ├── LineCommentModal.tsx # Line-level comment editor
│ │ ├── NewFileModal.tsx # New file creation modal
│ │ ├── IndiaWatermark.tsx # "Made in India" credit badge
│ │ └── ErrorBoundary.tsx # Crash-safe fallback UI
│ ├── screens/
│ │ ├── HomeScreen.tsx # Project list, import, clone entry
│ │ ├── IDEScreen.tsx # Main VS Code-style workspace
│ │ └── CloneScreen.tsx # GitHub URL clone flow with live logs
│ ├── context/
│ │ └── ThemeContext.tsx # Dark+/Light+ theme provider
│ ├── utils/
│ │ ├── zipExtractor.ts # Zip import → local file extraction
│ │ ├── gitClone.ts # GitHub codeload-based "clone"
│ │ ├── fileSystem.ts # Tree reading, search, stats
│ │ ├── storage.ts # Projects/bookmarks/recent files persistence
│ │ ├── notesStorage.ts # Notes & line-comments persistence
│ │ └── syntaxHighlighter.ts # Custom tokenizer + color palettes
│ └── types/
│ └── react-native-markdown-display.d.ts
└── assets/ # Icons, splash screens

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) LTS installed
- [Expo Go](https://expo.dev/go) app on your Android/iOS phone (for quick testing)
- An [Expo](https://expo.dev) account (free) — needed for EAS builds

### 1. Clone this repository

```powershell
git clone https://github.com/rajankumarsingh01/codeviewerapp.git
cd codeviewerapp
```

### 2. Install dependencies

```powershell
npm install
```

### 3. Run the development server

```powershell
npx expo start
```

Scan the QR code with **Expo Go** on your phone to run it instantly — no build required for development.

---

## 📦 Building a Standalone App (EAS)

### Install EAS CLI (one-time)

```powershell
npm install -g eas-cli
eas login
```

### Preview build (installable APK, for quick testing/sharing)

```powershell
eas build --platform android --profile preview
```

### Production build (App Bundle, for Play Store submission)

```powershell
eas build --platform android --profile production
```

Both profiles are pre-configured in [`eas.json`](./eas.json).

---

## 🗺️ Roadmap

- [ ] "Expand All" tree action (Collapse All already available)
- [ ] iOS EAS build profile & TestFlight distribution
- [ ] Export notes as a single Markdown/PDF file
- [ ] In-app project rename

---

## 🤝 Contributing

This is currently a solo-maintained project, but suggestions and issues are welcome — feel free to open an issue on GitHub.

---

## 📄 License

Licensed under the **MIT License** — free to use, modify, and distribute.

---

<div align="center">

### Made with ❤️ in India

**Rajan Kumar Singh**

[![GitHub](https://img.shields.io/badge/GitHub-rajankumarsingh01-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/rajankumarsingh01)

</div>