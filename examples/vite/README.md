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

## What to expect (current state)

`click-to-agent` resolves source via React's debug info + source maps. On
**React 19 + Vite** (verified with this example):

| Feature | Works? |
|---------|--------|
| Highlight + component name (Alt+Hover) | ✅ |
| Props / state preview (props, hooks, render count) | ✅ |
| **Alt+Click action picker** (Go to source / Ask Cursor / Ask Claude / Copy prompt) | ❌ not yet |
| **Alt+Right-click hierarchy** | ❌ not yet |

Why: the source-map resolver currently only understands Turbopack's
*sectioned* source map format (Next.js). Vite serves standard (non-sectioned)
source maps and React 19 dropped `_debugSource`, so source resolution returns
`null`. `handleClick` / `handleContextMenu` bail out early when resolution
fails — so the whole action menu (not just "Go to source") doesn't appear here
yet, even though the props/DOM/CSS context it would send is available.

Adding a generic (non-sectioned) source-map path — e.g. via
`@jridgewell/trace-mapping`, which Vite itself uses — would make Vite resolve,
unlocking both "Go to source" and the agent actions.
