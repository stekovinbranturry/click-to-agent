import type { EditorProtocol } from '../types';

const EDITOR_PROTOCOLS: Record<EditorProtocol, string> = {
  vscode: 'vscode://file',
  'vscode-insiders': 'vscode-insiders://file',
  cursor: 'cursor://file',
  webstorm: 'webstorm://open?file=',
  zed: 'zed://file',
};

/**
 * Build a URL that opens the given file at line:column in the target editor.
 *
 * Note: vscode://file/ protocol does not support range selection.
 * Range selection requires a companion VS Code extension (future work).
 *
 * Examples:
 * - vscode:    vscode://file/path/to/file.tsx:42:10
 * - webstorm:  webstorm://open?file=/path/to/file.tsx&line=42&column=10
 */
export function buildEditorUrl(
  editor: EditorProtocol,
  filePath: string,
  line: number,
  column: number,
): string {
  const protocol = EDITOR_PROTOCOLS[editor];
  // Protocols are `vscode://file` / `cursor://file` — need a slash before absolute paths.
  const path =
    filePath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(filePath)
      ? filePath
      : `/${filePath}`;

  if (editor === 'webstorm') {
    return `${protocol}${path}&line=${line}&column=${column}`;
  }

  return `${protocol}${path}:${line}:${column}`;
}
