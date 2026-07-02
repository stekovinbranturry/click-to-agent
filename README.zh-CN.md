# click-to-agent

React 组件定位器 — Alt/Option+点击跳转源码，或将完整上下文交给 Cursor & Claude。支持 Next.js、Vite、TanStack Start、Rsbuild。

[English](./README.md) · **简体中文**

**按住 <kbd>⌥</kbd> Option / <kbd>⎇</kbd> Alt 点击任意 React 组件 → 跳转源码，或将完整上下文交给 AI Agent。**

支持 React 18 & 19 · 无需浏览器插件 · 无需 Babel 插件

![click-to-agent 演示](https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/demo.gif)

---

## 1. 产品介绍

按住 <kbd>⌥</kbd> **Option**（Mac）或 <kbd>⎇</kbd> **Alt**（Win/Linux），与页面组件交互：

| 手势 | 效果 |
|------|------|
| <kbd>⌥</kbd> / <kbd>⎇</kbd> + **悬停** | 红色高亮框、组件名、源码路径、props/state 预览 |
| <kbd>⌥</kbd> / <kbd>⎇</kbd> + **点击** | 弹出四选一动作菜单（见下） |
| <kbd>⌥</kbd> / <kbd>⎇</kbd> + **右键** | 组件层级树 → 选择父组件 → 执行动作 |

![Option/Alt + 右键层级](https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/right-click.gif)

**每个组件均支持四种动作：**

| | 动作 | 说明 |
|---|------|------|
| ↗ | **Open in …** | 在配置的每个编辑器中打开对应文件（见 `editor` prop） |
| ▹ | **Ask Cursor** | 通过 Deeplink 打开 Cursor，并预填完整 Prompt |
| ◎ | **Ask Claude** | 通过 Deeplink 打开 Claude Code，上下文相同 |
| ⧉ | **Copy prompt** | 将完整 Prompt 复制到剪贴板 |

![动作选择器](https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/action-picker.png)

**Agent Prompt 自动包含：** 组件名 · 源码路径与行号 · props（JSON）· Hook/Class 状态 · 渲染后的 DOM HTML · 关键计算样式。

**核心卖点**

- **零成本上手** — 指着 UI 就能定位，不用在组件树里翻找
- **Agent 就绪** — Cursor / Claude 一次拿到 props、state、DOM、CSS
- **适配你的技术栈** — Next.js 零配置；Vite / TanStack Start / Rsbuild 只需传 `projectRoot`
- **不影响生产构建** — 默认仅在 `NODE_ENV === 'development'` 时包含在 bundle 中

---

## 2. 支持的框架

| | 框架 | 示例 |
|---|------|------|
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/nextjs.svg" width="22" height="22" alt="Next.js" /> | **Next.js**（Turbopack / webpack） | [`examples/nextjs`](./examples/nextjs) |
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/vite.svg" width="22" height="22" alt="Vite" /> | **Vite** + React | [`examples/vite`](./examples/vite) |
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/tanstack.png" width="22" height="22" alt="TanStack" /> | **TanStack Start** | [`examples/tanstack`](./examples/tanstack) |
| <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/rsbuild.svg" width="22" height="22" alt="Rsbuild" /> | **Rsbuild / Rspack** + React | [`examples/rsbuild`](./examples/rsbuild) |

React ≥ 18 · 需开启 Source Map。

---

## 3. 各框架接入方式

### 安装

```bash
pnpm add -D click-to-agent
npm install -D click-to-agent
yarn add -D click-to-agent
```

尽量把 `<Locator />` 挂在 React 树的高层。接入方式与 [`@tanstack/react-query-devtools`](https://tanstack.com/query/latest/docs/framework/react/devtools) 相同：**无需包装组件、无需 `enabled` prop** — 包入口在 `NODE_ENV !== 'development'` 时导出 no-op。

| 框架 | `projectRoot` |
|------|---------------|
| **Next.js** | 可选（自动解析） |
| **Vite / Rsbuild / TanStack Start** | 必填 — `define: { __PROJECT_ROOT__: JSON.stringify(process.cwd()) }` |

### <img src="https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/logos/nextjs.svg" width="22" height="22" valign="middle" alt="Next.js" /> Next.js

```tsx
// app/layout.tsx（或 pages/_app.tsx）
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

可选：在 `.env.local` 中设置 `NEXT_PUBLIC_PROJECT_ROOT` 代替 `projectRoot` prop。

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
// src/routes/__root.tsx — 放在 <body> 内
import { Locator } from 'click-to-agent';

declare const __PROJECT_ROOT__: string;

<Locator projectRoot={__PROJECT_ROOT__} />
```

---

## 4. `<Locator />` Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `editor` | `EditorProtocol[]` | `['cursor', 'vscode']` | **Go to source** 目标编辑器，每个条目对应一个菜单项 |
| `projectRoot` | `string` | — | 项目根目录绝对路径，用于 Source Map 路径解析。会覆盖 `NEXT_PUBLIC_PROJECT_ROOT`。Vite / TanStack Start / Rsbuild 通常需要（除非路径本身已是绝对路径） |
| `modifier` | `'alt'` \| `'ctrl'` \| `'meta'` \| `'shift'` | `'alt'` | 触发修饰键：<kbd>⎇</kbd> Alt / <kbd>⌥</kbd> Option · <kbd>⌃</kbd> Ctrl · <kbd>⌘</kbd> Cmd · <kbd>⇧</kbd> Shift |
| `highlightColor` | `string` | `'#ef4444'` | 高亮边框颜色（任意 CSS 颜色值） |
| `showPreview` | `boolean` | `true` | <kbd>⌥</kbd>/<kbd>⎇</kbd> + 悬停时是否显示 props / Hook 状态预览面板 |

```tsx
<Locator />
<Locator projectRoot={__PROJECT_ROOT__} />
<Locator editor={['cursor']} />
<Locator modifier="meta" highlightColor="#3b82f6" />
<Locator showPreview={false} />
```

> **Ask Cursor** / **Ask Claude** 使用各自的 Deeplink，与 `editor` prop 无关。

### TypeScript

```ts
import type { LocatorProps, EditorProtocol, AgentTarget, FiberInspection } from 'click-to-agent';
```

---

## 许可证

[MIT](./LICENSE) — 原版 © stkang9409，Fork © stekovinbranturry。
