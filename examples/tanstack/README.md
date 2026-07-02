# click-to-agent — TanStack Start example

Local playground for testing `click-to-agent` in a **TanStack Start + React 19**
app. Links to the local package via `workspace:*`.

## Run

From the **repo root**:

```bash
pnpm install
pnpm dev                                    # Terminal A: tsup --watch
pnpm --filter tanstack generate-routes    # once, if routeTree.gen.ts is missing
pnpm --filter tanstack dev                # Terminal B → http://localhost:5280
```

Hold **Alt** / **Option** and interact with a component.

The home page includes a nested **CounterButton → Counter → DemoPanel**
client-component tree — Alt+Right-click the `+` button to see a multi-level
hierarchy.

## Wiring

`<Locator />` 挂在 `src/routes/__root.tsx` 的 `<body>` 内，与 TanStack Devtools 并列。
`projectRoot` 通过 Vite `define` 注入：

```ts
// vite.config.ts
define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) },
```

## Verified (React 19 + TanStack Start)

| Feature | Works? |
|---------|--------|
| Alt+Hover highlight + component name | ✅ |
| Alt+Click action picker + source path | ✅ (`src/routes/index.tsx:…`) |
| Alt+Right-click hierarchy | ✅ (may be a single level when parent fibers lack `_debugStack`) |
