# click-to-agent

**English** · [简体中文](./README.zh-CN.md)

**<kbd>⌥</kbd> Option / <kbd>⎇</kbd> Alt + click any React component → jump to source, or hand it to your AI agent with full context.**

Dev-only · React 18 & 19 · No browser extension · No Babel plugin.

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
| ↗ | **Go to source** | Open the file at the exact line in your editor |
| ▹ | **Ask Cursor** | Deeplink to Cursor with a rich, pre-filled prompt |
| ◎ | **Ask Claude** | Deeplink to Claude Code with the same context |
| ⧉ | **Copy prompt** | Copy the full prompt to clipboard |

![Action picker](https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/action-picker.png)

**Agent prompts include:** component name · source path & line · props (JSON) · hook/class state · rendered DOM HTML · key computed CSS.

**Why use it**

- **Zero friction** — point at UI, don't hunt through the component tree
- **Agent-ready context** — Cursor / Claude get props, state, DOM, and CSS in one shot
- **Works with your stack** — Next.js zero-config; Vite / TanStack Start / Rsbuild need one `projectRoot` prop
- **Dev-only** — zero impact on production builds

---

## 2. Supported frameworks

| | Framework | Setup | Example |
|---|-----------|-------|---------|
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/nextjs.svg" height="22" alt="Next.js" /> | **Next.js** (Turbopack / webpack) | Zero-config | [`examples/nextjs`](./examples/nextjs) |
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/vite.svg" width="22" height="22" alt="Vite" /> | **Vite** + React | `projectRoot` via `define` | [`examples/vite`](./examples/vite) |
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/tanstack.png" width="22" height="22" alt="TanStack" /> | **TanStack Start** | Same as Vite (`define` + client boundary) | [`examples/tanstack`](./examples/tanstack) |
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/rsbuild.svg" width="22" height="22" alt="Rsbuild" /> | **Rsbuild / Rspack** + React | `projectRoot` via `source.define` | [`examples/rsbuild`](./examples/rsbuild) |

React ≥ 18 · dev-mode source maps · development only.

---

## 3. Quick start by framework

### Install

```bash
pnpm add click-to-agent
# npm install click-to-agent
# yarn add click-to-agent
```

### Next.js — zero-config

```tsx
// app/layout.tsx  (or pages/_app.tsx)
import { Locator } from 'click-to-agent';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Locator editor="cursor" />
      </body>
    </html>
  );
}
```

Optional env var instead of `projectRoot` prop:

```bash
# .env.local
NEXT_PUBLIC_PROJECT_ROOT=/absolute/path/to/your/app
```

### Vite — one `define`

```ts
// vite.config.ts
export default defineConfig({
  define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) },
  // ...
});
```

```tsx
// src/main.tsx
import { Locator } from 'click-to-agent';

declare const __PROJECT_ROOT__: string;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Locator enabled={import.meta.env.DEV} editor="cursor" projectRoot={__PROJECT_ROOT__} />
  </StrictMode>,
);
```

### TanStack Start — Vite `define` + client boundary

TanStack Start uses SSR; wrap `<Locator>` in a `'use client'` component:

```ts
// vite.config.ts
define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) },
```

```tsx
// src/components/LocatorDev.tsx
'use client';
import { Locator } from 'click-to-agent';
declare const __PROJECT_ROOT__: string;

export function LocatorDev() {
  if (!import.meta.env.DEV) return null;
  return <Locator editor="cursor" projectRoot={__PROJECT_ROOT__} />;
}
```

```tsx
// src/routes/__root.tsx — inside <body>
<LocatorDev />
```

### Rsbuild / Rspack — `source.define`

```ts
// rsbuild.config.ts
export default defineConfig({
  source: {
    define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) },
  },
  // ...
});
```

```tsx
// src/index.tsx
import { Locator } from 'click-to-agent';
declare const __PROJECT_ROOT__: string;

root.render(
  <StrictMode>
    <App />
    {import.meta.env.DEV && (
      <Locator editor="cursor" projectRoot={__PROJECT_ROOT__} />
    )}
  </StrictMode>,
);
```

---

## 4. `<Locator />` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editor` | `'vscode'` \| `'vscode-insiders'` \| `'cursor'` \| `'webstorm'` \| `'zed'` | `'vscode'` | Editor opened by **Go to source** |
| `projectRoot` | `string` | — | Absolute project root for source-map path resolution. Overrides `NEXT_PUBLIC_PROJECT_ROOT`. Required for Vite / TanStack Start / Rsbuild unless paths already resolve absolutely |
| `modifier` | `'alt'` \| `'ctrl'` \| `'meta'` \| `'shift'` | `'alt'` | Modifier key: <kbd>⎇</kbd> Alt / <kbd>⌥</kbd> Option · <kbd>⌃</kbd> Ctrl · <kbd>⌘</kbd> Cmd · <kbd>⇧</kbd> Shift |
| `enabled` | `boolean` | `true` in dev | Force enable or disable |
| `highlightColor` | `string` | `'#ef4444'` | Overlay border color (any CSS color) |
| `showPreview` | `boolean` | `true` | Props / hook-state preview panel on <kbd>⌥</kbd>/<kbd>⎇</kbd> + hover |

```tsx
// Common setups
<Locator />                                          // Next.js defaults
<Locator editor="cursor" />                          // Go to source → Cursor
<Locator projectRoot={__PROJECT_ROOT__} />             // Vite / Rsbuild
<Locator modifier="meta" highlightColor="#3b82f6" />  // ⌘+click, blue overlay
<Locator showPreview={false} />                        // No props panel
```

> **Ask Cursor** / **Ask Claude** use their own deeplinks — independent of the `editor` prop, which only affects **Go to source**.

### TypeScript

```ts
import type { LocatorProps, EditorProtocol, AgentTarget, FiberInspection } from 'click-to-agent';
```

---

## License

[MIT](./LICENSE) — original © stkang9409, fork © stekovinbranturry.
