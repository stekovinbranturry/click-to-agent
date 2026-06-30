# click-to-agent — Next.js example

A local playground for testing `click-to-agent` against the workspace source
(no npm publish needed). It links to the local package via `workspace:*`.

## Run

From the **repo root**:

```bash
# 1. install (links the local click-to-agent into this example)
pnpm install

# 2. keep the library building on change (Terminal A)
pnpm dev            # tsup --watch at the repo root

# 3. start the example (Terminal B)
pnpm --filter example-nextjs dev
```

Open http://localhost:3000, then hold **Alt** (Windows/Linux) or **Option** (Mac):

- **Alt + Hover** — highlight a component and see its source path
- **Alt + Click** — open the four-action picker (Go to source / Ask Cursor / Ask Claude / Copy prompt)
- **Alt + Right-click** — open the component hierarchy

> The library reads from its built `dist/`, so keep `pnpm dev` (step 2) running
> to pick up source changes live.
