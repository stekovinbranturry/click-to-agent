import { AnyMap, originalPositionFor } from '@jridgewell/trace-mapping';
import type { TraceMap } from '@jridgewell/trace-mapping';
import type { ResolvedSource } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Parsed source maps keyed by chunk URL. */
export type SourceMapCache = Map<string, TraceMap>;

/** Check if a path is inside node_modules */
export function isNodeModulesPath(path: string): boolean {
  return path.includes('/node_modules/') || path.startsWith('node_modules/');
}

/** Read NEXT_PUBLIC_PROJECT_ROOT defensively (process may be undefined in some bundlers). */
function envProjectRoot(): string {
  try {
    return (
      (typeof process !== 'undefined' &&
        process.env &&
        process.env.NEXT_PUBLIC_PROJECT_ROOT) ||
      ''
    );
  } catch {
    return '';
  }
}

/**
 * Source maps from webpack/Rspack (Rsbuild) sometimes encode absolute paths
 * without a leading slash, e.g. `Users/foo/project/src/App.tsx` on macOS.
 */
function isAbsoluteLikePath(path: string): boolean {
  return (
    path.startsWith('/') ||
    path.startsWith('Users/') ||
    path.startsWith('home/') ||
    /^[A-Za-z]:[\\/]/.test(path)
  );
}

function ensureAbsolutePath(path: string): string {
  if (path.startsWith('/')) return path;
  if (path.startsWith('Users/') || path.startsWith('home/')) return `/${path}`;
  return path;
}

/**
 * Clean up file paths returned by bundler source maps.
 * - Ensure macOS/Linux absolute paths have a leading slash (`Users/...` → `/Users/...`)
 * - Strip an accidental `{projectRoot}/` prefix before an absolute path segment
 *   (Rspack/Rsbuild sometimes yields `Users/...` without `/`, which was joined with projectRoot)
 */
function sanitizeFilePath(path: string, projectRoot?: string): string {
  let p = path;
  const root = projectRoot ?? envProjectRoot();

  if (root) {
    const withSlash = `${root}/`;
    const rest = p.startsWith(withSlash) ? p.slice(withSlash.length) : null;
    if (rest && isAbsoluteLikePath(rest)) {
      p = ensureAbsolutePath(rest);
    } else if (p.startsWith(root) && p.length > root.length) {
      const suffix = p.slice(root.length);
      if (suffix.startsWith('/Users/') || suffix.startsWith('/home/')) {
        p = suffix;
      }
    }
  }

  return isAbsoluteLikePath(p) ? ensureAbsolutePath(p) : p;
}

/** Absolute path safe for editor deeplinks (`cursor://file/...`, `vscode://file/...`). */
export function resolveEditorFilePath(
  filePath: string,
  projectRoot?: string,
): string {
  return sanitizeFilePath(filePath, projectRoot);
}

/**
 * Convert an absolute file path to a relative one for display.
 * Strips projectRoot prefix, or looks for common markers like src/, app/.
 */
export function toRelativePath(
  absolutePath: string,
  projectRoot?: string,
): string {
  const normalized = sanitizeFilePath(absolutePath, projectRoot);
  const root = projectRoot ?? envProjectRoot();
  if (root && normalized.startsWith(root)) {
    const relative = normalized.slice(root.length);
    return relative.startsWith('/') ? relative.slice(1) : relative;
  }
  // Try to find common directory markers
  const markers = ['/src/', '/app/', '/pages/', '/components/'];
  for (const marker of markers) {
    const idx = normalized.indexOf(marker);
    if (idx !== -1) return normalized.slice(idx + 1);
  }
  // Last resort: return last 3 path segments
  const parts = normalized.split('/');
  return parts.slice(-3).join('/');
}

/**
 * Convert a turbopack:///[project]/... URI to an absolute file path.
 *
 * Examples:
 * - turbopack:///[project]/Users/foo/project/src/App.tsx → /Users/foo/project/src/App.tsx
 * - turbopack:///[project]/src/App.tsx → {projectRoot}/src/App.tsx
 */
export function extractPathFromTurbopack(
  uri: string,
  projectRoot?: string,
): string {
  const match = uri.match(/turbopack:\/\/\/\[project\]\/(.*)/);
  if (match) {
    const relativePath = match[1];
    if (relativePath.startsWith('Users/') || relativePath.startsWith('home/')) {
      return '/' + relativePath;
    }
    const root = projectRoot ?? envProjectRoot();
    return root ? `${root}/${relativePath}` : relativePath;
  }
  return uri;
}

/**
 * Normalize a source-map "source" entry into a usable file path.
 *
 * Handles the schemes seen across bundlers:
 * - file://...                      → strip scheme
 * - turbopack:///[project]/...      → Next.js + Turbopack
 * - webpack://name/./src/...        → Next.js + webpack
 * - http(s)://host/src/App.tsx      → Vite dev (resolved against the module URL);
 *                                     /@fs/<abs> is an absolute path, otherwise the
 *                                     pathname is joined with projectRoot
 */
function normalizeSourcePath(source: string, projectRoot?: string): string {
  let s = source;
  const qh = s.search(/[?#]/);
  if (qh !== -1) s = s.slice(0, qh);

  let result = s;

  if (s.startsWith('file://')) {
    result = s.slice('file://'.length);
  } else if (s.startsWith('turbopack:///')) {
    result = extractPathFromTurbopack(s, projectRoot);
  } else if (/^webpack:\/\//.test(s)) {
    const webpack = s.match(/^webpack:\/\/[^/]*\/(?:\.\/)?(.*)$/);
    const rel = webpack?.[1] ?? s;
    if (isAbsoluteLikePath(rel)) {
      result = ensureAbsolutePath(rel);
    } else {
      const root = projectRoot ?? envProjectRoot();
      result = root ? `${root}/${rel}` : rel;
    }
  } else if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const pathname = new URL(s).pathname;
      if (pathname.startsWith('/@fs/')) {
        result = pathname.slice('/@fs'.length);
      } else {
        const root = projectRoot ?? envProjectRoot();
        result = root
          ? pathname.startsWith('/')
            ? `${root}${pathname}`
            : `${root}/${pathname}`
          : pathname;
      }
    } catch {
      result = s;
    }
  } else if (isAbsoluteLikePath(s)) {
    result = ensureAbsolutePath(s);
  }

  return sanitizeFilePath(result, projectRoot);
}

/**
 * Given source file content and a start line (1-indexed),
 * find the end line of the component/function body via brace counting.
 */
function findComponentEndLine(
  content: string,
  startLine: number,
): number | undefined {
  const lines = content.split('\n');
  let depth = 0;
  let found = false;

  for (let i = startLine - 1; i < Math.min(lines.length, startLine + 500); i++) {
    for (const ch of lines[i]) {
      if (ch === '{') {
        depth++;
        found = true;
      }
      if (ch === '}') depth--;
      if (found && depth === 0) return i + 1; // 1-indexed
    }
  }
  return undefined;
}

/** Extract the last sourceMappingURL from served module code (inline data URI or linked). */
async function mapFromModuleCode(
  code: string,
  chunkUrl: string,
): Promise<{ raw: any; mapUrl: string } | null> {
  const matches = [...code.matchAll(/[#@]\s*sourceMappingURL=([^\s'"]+)/g)];
  if (matches.length === 0) return null;
  const url = matches[matches.length - 1][1];

  if (url.startsWith('data:')) {
    const comma = url.indexOf(',');
    if (comma === -1) return null;
    const meta = url.slice(0, comma);
    const payload = url.slice(comma + 1);
    try {
      const json = meta.includes('base64')
        ? atob(payload)
        : decodeURIComponent(payload);
      // Inline map → sources are relative to the module itself.
      return { raw: JSON.parse(json), mapUrl: chunkUrl };
    } catch {
      return null;
    }
  }

  try {
    const abs = new URL(url, chunkUrl).href;
    const resp = await fetch(abs);
    if (!resp.ok) return null;
    return { raw: await resp.json(), mapUrl: abs };
  } catch {
    return null;
  }
}

/**
 * Fetch a source map for a chunk URL. Tries an external `<chunk>.map` first
 * (Next.js / Turbopack / webpack), then falls back to an inline or linked
 * sourceMappingURL inside the served module (Vite, esbuild).
 */
async function fetchRawMap(
  chunkUrl: string,
): Promise<{ raw: any; mapUrl: string } | null> {
  try {
    const resp = await fetch(chunkUrl + '.map');
    if (resp.ok) {
      return { raw: await resp.json(), mapUrl: chunkUrl + '.map' };
    }
  } catch {
    // fall through to inline lookup
  }

  try {
    const resp = await fetch(chunkUrl);
    if (!resp.ok) return null;
    const code = await resp.text();
    return await mapFromModuleCode(code, chunkUrl);
  } catch {
    return null;
  }
}

/** Load (and cache) a TraceMap for a chunk URL. Supports flat and indexed (sectioned) maps. */
async function loadTraceMap(
  chunkUrl: string,
  cache: SourceMapCache,
): Promise<TraceMap | null> {
  const cached = cache.get(chunkUrl);
  if (cached) return cached;

  const fetched = await fetchRawMap(chunkUrl);
  if (!fetched) return null;

  let tracer: TraceMap;
  try {
    // AnyMap handles both standard and indexed ("sections") source maps;
    // plain TraceMap throws on sectioned maps (Turbopack/webpack dev output).
    tracer = new AnyMap(fetched.raw, fetched.mapUrl);
  } catch {
    return null;
  }
  cache.set(chunkUrl, tracer);
  return tracer;
}

/**
 * Prefetch a source map into the cache without resolving a specific position.
 * Non-blocking, best-effort. Returns immediately if already cached.
 */
export async function prefetchSourceMap(
  chunkUrl: string,
  cache: SourceMapCache,
): Promise<void> {
  if (cache.has(chunkUrl)) return;
  try {
    await loadTraceMap(chunkUrl, cache);
  } catch {
    // best-effort
  }
}

/**
 * Resolve the original source position for a generated line/column.
 * Uses @jridgewell/trace-mapping, which handles both standard and indexed
 * ("sections") source maps. Generated line is 1-based (matches Error stacks);
 * the stack's 1-based column is converted to the 0-based column maps use.
 */
export async function resolveSourceMap(
  chunkUrl: string,
  generatedLine: number,
  generatedColumn: number,
  cache: SourceMapCache,
  projectRoot?: string,
): Promise<ResolvedSource | null> {
  const tracer = await loadTraceMap(chunkUrl, cache);
  if (!tracer) return null;

  const pos = originalPositionFor(tracer, {
    line: generatedLine,
    column: Math.max(0, generatedColumn - 1),
  });

  if (pos.source == null || pos.line == null) return null;

  const filePath = normalizeSourcePath(pos.source, projectRoot);
  if (isNodeModulesPath(filePath)) return null;

  const originalLine = pos.line;

  let endLine: number | undefined;
  const idx = tracer.resolvedSources.indexOf(pos.source);
  const content =
    idx >= 0 ? tracer.sourcesContent?.[idx] ?? undefined : undefined;
  if (content) endLine = findComponentEndLine(content, originalLine);

  return {
    filePath,
    originalLine,
    originalColumn: pos.column ?? 0,
    endLine,
  };
}
