# click-to-agent — Vite example

A local playground for testing `click-to-agent` in a plain **Vite + React 19**
app (no framework, no publish). Links to the local package via `workspace:*`.

## Run

From the **repo root**:

```bash
pnpm install                      # links the local click-to-agent
pnpm dev                          # Terminal A: tsup --watch (rebuild the lib)
pnpm --filter example-vite dev    # Terminal B: start Vite
```

Open http://localhost:5273, then hold **Alt** / **Option** and interact with a
component (hover / click / right-click).

## What to expect

`click-to-agent` resolves source via React's debug info + source maps. On
**React 19 + Vite** (verified with this example):

| Feature | Works? |
|---------|--------|
| Highlight + component name (Alt+Hover) | ✅ |
| Props / state preview (props, hooks, render count) | ✅ |
| **Alt+Click action picker** (Go to source / Ask Cursor / Ask Claude / Copy prompt) | ✅ |
| **Alt+Right-click hierarchy** | ✅ |

Source resolution uses [`@jridgewell/trace-mapping`](https://github.com/jridgewell/trace-mapping)
(`AnyMap`), which understands both Turbopack's *sectioned* maps (Next.js) and
the standard maps Vite serves — inline `data:` URIs in dev, external `.map`
files in preview/build.

### `projectRoot` on Vite

Vite's source maps reference sources by a root-relative name (e.g. `App.tsx`),
which resolves against the dev-server URL (`/src/App.tsx`) — not an absolute
filesystem path. To make **Go to source** open the right file, this example
passes `projectRoot` to `<Locator>`:

```ts
// vite.config.ts
export default defineConfig({
  define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) },
});
```

```tsx
// src/main.tsx
<Locator enabled={import.meta.env.DEV} projectRoot={__PROJECT_ROOT__} />
```

Files served via Vite's `/@fs/<abs>` (outside the root) resolve to absolute
paths automatically and don't need `projectRoot`.
