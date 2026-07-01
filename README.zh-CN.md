# click-to-agent

[English](./README.md) · **简体中文**

**按住 <kbd>⌥</kbd> Option / <kbd>⎇</kbd> Alt 点击任意 React 组件 → 跳转源码，或将完整上下文交给 AI Agent。**

仅开发环境 · 支持 React 18 & 19 · 无需浏览器插件 · 无需 Babel 插件

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
| ↗ | **Go to source** | 在编辑器中打开对应文件与行号 |
| ▹ | **Ask Cursor** | 通过 Deeplink 打开 Cursor，并预填完整 Prompt |
| ◎ | **Ask Claude** | 通过 Deeplink 打开 Claude Code，上下文相同 |
| ⧉ | **Copy prompt** | 将完整 Prompt 复制到剪贴板 |

![动作选择器](https://raw.githubusercontent.com/stekovinbranturry/click-to-agent/main/docs/action-picker.png)

**Agent Prompt 自动包含：** 组件名 · 源码路径与行号 · props（JSON）· Hook/Class 状态 · 渲染后的 DOM HTML · 关键计算样式。

**核心卖点**

- **零成本上手** — 指着 UI 就能定位，不用在组件树里翻找
- **Agent 就绪** — Cursor / Claude 一次拿到 props、state、DOM、CSS
- **适配你的技术栈** — Next.js 零配置；Vite / TanStack Start / Rsbuild 只需传 `projectRoot`
- **仅开发环境** — 不影响生产构建

---

## 2. 支持的框架

| | 框架 | 接入 | 示例 |
|---|------|------|------|
| <img src="https://cdn.simpleicons.org/nextdotjs/000000" width="22" height="22" alt="" /> | **Next.js**（Turbopack / webpack） | 零配置 | [`examples/nextjs`](./examples/nextjs) |
| <img src="https://cdn.simpleicons.org/vite/646CFF" width="22" height="22" alt="" /> | **Vite** + React | `define` 注入 `projectRoot` | [`examples/vite`](./examples/vite) |
| <img src="https://cdn.simpleicons.org/tanstack/0055FF" width="22" height="22" alt="" /> | **TanStack Start** | 同 Vite（`define` + Client 边界） | [`examples/tanstack`](./examples/tanstack) |
| <img src="https://cdn.simpleicons.org/rspack/8A8A8A" width="22" height="22" alt="" /> | **Rsbuild / Rspack** + React | `source.define` 注入 `projectRoot` | [`examples/rsbuild`](./examples/rsbuild) |

React ≥ 18 · 开发模式 Source Map · 仅开发环境使用。

---

## 3. 各框架接入方式

### 安装

```bash
pnpm add click-to-agent
# npm install click-to-agent
# yarn add click-to-agent
```

### Next.js — 零配置

```tsx
// app/layout.tsx（或 pages/_app.tsx）
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

也可用环境变量代替 `projectRoot` prop：

```bash
# .env.local
NEXT_PUBLIC_PROJECT_ROOT=/absolute/path/to/your/app
```

### Vite — 一行 `define`

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

### TanStack Start — Vite `define` + Client 边界

TanStack Start 使用 SSR，需将 `<Locator>` 包在 `'use client'` 组件中：

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
// src/routes/__root.tsx — 放在 <body> 内
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

## 4. `<Locator />` Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `editor` | `'vscode'` \| `'vscode-insiders'` \| `'cursor'` \| `'webstorm'` \| `'zed'` | `'vscode'` | **Go to source** 打开的编辑器 |
| `projectRoot` | `string` | — | 项目根目录绝对路径，用于 Source Map 路径解析。会覆盖 `NEXT_PUBLIC_PROJECT_ROOT`。Vite / TanStack Start / Rsbuild 通常需要（除非路径本身已是绝对路径） |
| `modifier` | `'alt'` \| `'ctrl'` \| `'meta'` \| `'shift'` | `'alt'` | 触发修饰键：<kbd>⎇</kbd> Alt / <kbd>⌥</kbd> Option · <kbd>⌃</kbd> Ctrl · <kbd>⌘</kbd> Cmd · <kbd>⇧</kbd> Shift |
| `enabled` | `boolean` | 开发环境为 `true` | 强制启用或禁用 |
| `highlightColor` | `string` | `'#ef4444'` | 高亮边框颜色（任意 CSS 颜色值） |
| `showPreview` | `boolean` | `true` | <kbd>⌥</kbd>/<kbd>⎇</kbd> + 悬停时是否显示 props / Hook 状态预览面板 |

```tsx
// 常见配置
<Locator />                                          // Next.js 默认
<Locator editor="cursor" />                          // Go to source → Cursor
<Locator projectRoot={__PROJECT_ROOT__} />             // Vite / Rsbuild
<Locator modifier="meta" highlightColor="#3b82f6" />  // ⌘+点击，蓝色高亮
<Locator showPreview={false} />                        // 关闭 props 预览
```

> **Ask Cursor** / **Ask Claude** 使用各自的 Deeplink，与 `editor` prop 无关；`editor` 仅影响 **Go to source**。

### TypeScript

```ts
import type { LocatorProps, EditorProtocol, AgentTarget, FiberInspection } from 'click-to-agent';
```

---

## 许可证

[MIT](./LICENSE) — 原版 © stkang9409，Fork © stekovinbranturry。
