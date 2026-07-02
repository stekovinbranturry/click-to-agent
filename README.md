# click-to-agent

React component locator — Alt/Option+click to open source or send full context to Cursor & Claude. Next.js, Vite, TanStack Start, Rsbuild.

**English** · [简体中文](./README.zh-CN.md)

**<kbd>⌥</kbd> Option / <kbd>⎇</kbd> Alt + click any React component → jump to source, or hand it to your AI agent with full context.**

React 18 & 19 · No browser extension · No Babel plugin.

![click-to-agent demo](https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/demo.gif)

---

## 1. What it does

Hold <kbd>⌥</kbd> **Option** (Mac) or <kbd>⎇</kbd> **Alt** (Win/Linux) and interact with any component:

| Gesture | Result |
|---------|--------|
| <kbd>⌥</kbd> / <kbd>⎇</kbd> + **Hover** | Red overlay, component name, source path, props/state preview |
| <kbd>⌥</kbd> / <kbd>⎇</kbd> + **Click** | Four-action picker (see below) |
| <kbd>⌥</kbd> / <kbd>⎇</kbd> + **Right-click** | Component ancestry tree → pick a parent → act on it |

![Option/Alt + Right-click hierarchy](https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/right-click.gif)

**Four actions** on every component:

| | Action | What happens |
|---|--------|--------------|
| ↗ | **Open in …** | Open the file in each configured editor (see `editor` prop) |
| ▹ | **Ask Cursor** | Deeplink to Cursor with a rich, pre-filled prompt |
| ◎ | **Ask Claude** | Deeplink to Claude Code with the same context |
| ⧉ | **Copy prompt** | Copy the full prompt to clipboard |

![Action picker](https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/action-picker.png)

**Agent prompts include:** component name · source path & line · props (JSON) · hook/class state · rendered DOM HTML · key computed CSS.

**Why use it**

- **Zero friction** — point at UI, don't hunt through the component tree
- **Agent-ready context** — Cursor / Claude get props, state, DOM, and CSS in one shot
- **Works with your stack** — Next.js zero-config; Vite / TanStack Start / Rsbuild need one `projectRoot` prop
- **Zero production impact** — included in bundles only when `NODE_ENV === 'development'`

---

## 2. Supported frameworks

| | Framework | Example |
|---|-----------|---------|
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/nextjs.svg" width="22" height="22" alt="Next.js" /> | **Next.js** (Turbopack / webpack) | [`examples/nextjs`](./examples/nextjs) |
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/vite.svg" width="22" height="22" alt="Vite" /> | **Vite** + React | [`examples/vite`](./examples/vite) |
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/tanstack.png" width="22" height="22" alt="TanStack" /> | **TanStack Start** | [`examples/tanstack`](./examples/tanstack) |
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/rsbuild.svg" width="22" height="22" alt="Rsbuild" /> | **Rsbuild / Rspack** + React | [`examples/rsbuild`](./examples/rsbuild) |

React ≥ 18 · source maps enabled.

---

## 3. Quick start by framework

### Install

```bash
pnpm add -D click-to-agent
npm install -D click-to-agent
yarn add -D click-to-agent
```

Place `<Locator />` as high in your React tree as possible. Same pattern as [`@tanstack/react-query-devtools`](https://tanstack.com/query/latest/docs/framework/react/devtools): **no wrappers, no `enabled` prop** — the package entry exports a no-op in production when `process.env.NODE_ENV !== 'development'`.

| Framework | `projectRoot` |
|-----------|---------------|
| **Next.js** | Optional (auto) |
| **Vite / Rsbuild / TanStack Start** | Required — `define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) }` |

### <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/nextjs.svg" width="22" height="22" valign="middle" alt="Next.js" /> Next.js

```tsx
// app/layout.tsx  (or pages/_app.tsx)
import { Locator } from 'click-to-agent';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Locator />
      </body>
    </html>
  );
}
```

Optional: `NEXT_PUBLIC_PROJECT_ROOT` in `.env.local` instead of the `projectRoot` prop.

### <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/vite.svg" width="22" height="22" valign="middle" alt="Vite" /> Vite

```ts
// vite.config.ts
export default defineConfig({
  define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) },
});
```

```tsx
// src/main.tsx
import { Locator } from 'click-to-agent';

declare const __PROJECT_ROOT__: string;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Locator projectRoot={__PROJECT_ROOT__} />
  </StrictMode>,
);
```

### <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/rsbuild.svg" width="22" height="22" valign="middle" alt="Rsbuild" /> Rsbuild / Rspack

```ts
// rsbuild.config.ts
export default defineConfig({
  source: {
    define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) },
  },
});
```

```tsx
// src/index.tsx
import { Locator } from 'click-to-agent';

declare const __PROJECT_ROOT__: string;

root.render(
  <StrictMode>
    <App />
    <Locator projectRoot={__PROJECT_ROOT__} />
  </StrictMode>,
);
```

### <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/tanstack.png" width="22" height="22" valign="middle" alt="TanStack" /> TanStack Start

```ts
// vite.config.ts
define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) },
```

```tsx
// src/routes/__root.tsx — inside <body>
import { Locator } from 'click-to-agent';

declare const __PROJECT_ROOT__: string;

<Locator projectRoot={__PROJECT_ROOT__} />
```

---

## 4. `<Locator />` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editor` | `EditorProtocol[]` | `['cursor', 'vscode']` | Editors for **Go to source** — one menu item per entry |
| `projectRoot` | `string` | — | Absolute project root for source-map path resolution. Overrides `NEXT_PUBLIC_PROJECT_ROOT`. Required for Vite / TanStack Start / Rsbuild unless paths already resolve absolutely |
| `modifier` | `'alt'` \| `'ctrl'` \| `'meta'` \| `'shift'` | `'alt'` | Modifier key: <kbd>⎇</kbd> Alt / <kbd>⌥</kbd> Option · <kbd>⌃</kbd> Ctrl · <kbd>⌘</kbd> Cmd · <kbd>⇧</kbd> Shift |
| `highlightColor` | `string` | `'#ef4444'` | Overlay border color (any CSS color) |
| `showPreview` | `boolean` | `true` | Props / hook-state preview panel on <kbd>⌥</kbd>/<kbd>⎇</kbd> + hover |

```tsx
<Locator />
<Locator projectRoot={__PROJECT_ROOT__} />
<Locator editor={['cursor']} />
<Locator modifier="meta" highlightColor="#3b82f6" />
<Locator showPreview={false} />
```

> **Ask Cursor** / **Ask Claude** use their own deeplinks — independent of the `editor` prop.

### TypeScript

```ts
import type { LocatorProps, EditorProtocol, AgentTarget, FiberInspection } from 'click-to-agent';
```

---

## License

[MIT](./LICENSE) — original © stkang9409, fork © stekovinbranturry.
