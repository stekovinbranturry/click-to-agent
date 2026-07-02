# Changelog

## 0.3.0

### Minor Changes

- Export a dev-only Locator no-op at the package entry (like `@tanstack/react-query-devtools`), so apps mount `<Locator />` directly without wrappers, `enabled`, or dynamic import.

  **Breaking:** removed the `enabled` prop.

## 0.2.0

### Minor Changes

- **`editor` prop is now an array** — default `['cursor', 'vscode']`, one **Open in …** menu action per editor for team-friendly setups.
- **Broader bundler support** — Vite, TanStack Start, and Rsbuild/Rspack via `projectRoot`; standard & sectioned source maps via `@jridgewell/trace-mapping`.

### Patch Changes

- **Alt+Right-click hierarchy** — filter framework internals, viewport-safe menu positioning, React 19 ancestry fallback.
- **Rsbuild / webpack paths** — normalize prefix-less absolute paths so **Go to source** opens the correct file.

## 0.0.1

### Patch Changes

- 2fb057d: first publish

## click-to-agent

### 0.1.0 (2026-06-30)

First release as `click-to-agent`, a fork of [`nextjs-locator`](https://github.com/stkang9409/nextjs-locator).

#### Features

- **Four per-component actions** in the Alt+Click / Alt+Right-click picker:
  - ↗ **Go to source** — open the file in your editor
  - ▹ **Ask Cursor** — open Cursor via `cursor://anysphere.cursor-deeplink/prompt?text=` with full component context
  - ◎ **Ask Claude** — open Claude Code via `vscode://anthropic.claude-code/open?prompt=` with full component context
  - ⧉ **Copy prompt** — copy the full component prompt to the clipboard
- **Rich agent prompt** — instruction + component name/file/line + props + hook/class state + rendered DOM HTML + key computed CSS
- **Deeplink-safe prompts** — encoded length capped at 28k (HTML shrunk/dropped as needed); `Copy prompt` keeps the full prompt
- Fully English UI; zero runtime dependencies

---

## nextjs-locator (upstream history)

## 0.3.0 (2026-02-08)

### Features

- **Props/State preview panel** — Hover shows component props, hook state (useState, useReducer, useMemo, useRef), and render count in a floating panel
- **Safe value serialization** — Handles circular refs, React elements, functions, symbols, and deeply nested objects
- **Class component support** — Displays `stateNode.state` for class components (fiber.tag === 1)
- **`showPreview` prop** — New prop to enable/disable the preview panel (default: true)
- **`data-locator-source` fast path** — Detects compile-time injected source attributes for instant resolution
- **`nextjs-locator-swc` companion** — Optional Babel plugin that injects `data-locator-source` attributes at build time

## 0.2.0 (2025-02-08)

### Features

- **File path tooltip** — Hover shows `<ComponentName> — src/path/file.tsx:33` with async source map resolution
- **Component hierarchy menu** — Alt+Right-click shows parent component ancestry, each item clickable
- **Source map prefetch** — Prefetches `.map` files when modifier key is pressed for instant resolution
- **React 18 `_debugSource` fallback** — Works with React 18 projects (no source map fetch needed)
- **Keyboard navigation** — Arrow Up/Down, Enter, Escape in hierarchy menu

## 0.1.0 (2025-02-08)

### Features

- Alt+Click to open source files in editor
- React 19 `_debugStack` support
- Turbopack sections source map format
- VLQ source map decoder
- Multi-editor support (VS Code, Cursor, WebStorm, Zed, VS Code Insiders)
- Configurable modifier key, highlight color, and project root
- Zero external dependencies
- Production tree-shaking (completely removed in production builds)
