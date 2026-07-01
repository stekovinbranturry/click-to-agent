/** Supported editor protocols for opening source files */
export type EditorProtocol =
  | 'vscode'
  | 'vscode-insiders'
  | 'cursor'
  | 'webstorm'
  | 'zed';

export interface LocatorProps {
  /** Editors for **Go to source** — one menu action each. Default: `['cursor', 'vscode']`. */
  editor?: EditorProtocol[];
  /** Absolute project root path. Overrides NEXT_PUBLIC_PROJECT_ROOT env var */
  projectRoot?: string;
  /** Keyboard modifier to activate locator. Default: 'alt' */
  modifier?: 'alt' | 'ctrl' | 'meta' | 'shift';
  /** Whether the locator is enabled. Default: `true` */
  enabled?: boolean;
  /** Overlay border color (CSS color). Default: '#ef4444' (red) */
  highlightColor?: string;
  /** Show props/state preview panel on Alt+hover. Default: true */
  showPreview?: boolean;
}

/** Coding-agent target for the "Ask" / "Copy prompt" workflow */
export type AgentTarget = 'cursor' | 'claude' | 'copy';

/** Context passed to the "Ask agent" workflow */
export interface AskContext {
  componentName: string;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  fiber: any;
  element: HTMLElement;
  filePath?: string;
  line?: number;
}

/** Parsed stack frame from React _debugStack */
export interface StackFrame {
  chunkUrl: string;
  line: number;
  column: number;
}

/** Resolved original source location */
export interface ResolvedSource {
  filePath: string;
  originalLine: number;
  originalColumn: number;
  endLine?: number;
}

/** React 18 _debugSource object on Fiber nodes */
export interface DebugSource {
  fileName: string;
  lineNumber?: number;
  columnNumber?: number;
}

/** Context menu item representing a component in the ancestor chain */
export interface ContextMenuItem {
  componentName: string;
  filePath?: string;
  line?: number;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  fiber: any;
}

/** Serialized value for safe display in preview panel */
export interface SerializedValue {
  display: string;
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'null'
    | 'undefined'
    | 'object'
    | 'array'
    | 'function'
    | 'element'
    | 'symbol'
    | 'other';
}

/** A single prop entry for display */
export interface PropEntry {
  key: string;
  value: SerializedValue;
}

/** A single hook state entry for display */
export interface HookEntry {
  index: number;
  hookType: string;
  value: SerializedValue;
}

/** Complete fiber inspection result */
export interface FiberInspection {
  props: PropEntry[];
  hooks: HookEntry[];
  renderCount: number;
  isClassComponent: boolean;
  classState: PropEntry[] | null;
}
