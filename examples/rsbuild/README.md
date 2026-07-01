# click-to-agent — Rsbuild (Rspack) example

Local playground for testing `click-to-agent` in an **Rsbuild + React 19**
app (Rspack under the hood). Links to the local package via `workspace:*`.

## Run

From the **repo root**:

```bash
pnpm install
pnpm dev                              # Terminal A: tsup --watch
pnpm --filter rsbuild dev             # Terminal B → http://localhost:5275
```

Hold **Alt** / **Option** and interact with a component.

The page includes a nested **CounterButton → Counter → DemoPanel**
component tree — Alt+Right-click the `+` button to see a multi-level hierarchy.

## Wiring

`<Locator>` is mounted in `src/index.tsx`. `projectRoot` is injected via
Rsbuild `source.define`:

```ts
// rsbuild.config.ts
source: {
  define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) },
},
```

## Verified (React 19 + Rsbuild)

| Feature | Works? |
|---------|--------|
| Alt+Hover highlight + source path | ✅ |
| Alt+Click action picker | ✅ |
| Alt+Right-click hierarchy | ✅ |

Source maps use webpack-style `webpack://` paths; `source-map.ts` normalizes
them with `projectRoot`.
