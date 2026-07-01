'use client';

import { useEffect } from 'react';
import type { LocatorProps, EditorProtocol, ResolvedSource, ContextMenuItem } from './types';
import {
  getFiberFromElement,
  findNearestComponentFiber,
  getComponentName,
  extractStackFrame,
  extractDebugSource,
  extractDataLocatorSource,
  collectComponentAncestry,
  collectVisibleChunkUrls,
  getFiberBoundingRect,
} from './lib/fiber';
import {
  resolveSourceMap,
  prefetchSourceMap,
  toRelativePath,
  resolveEditorFilePath,
  type SourceMapCache,
} from './lib/source-map';
import { buildEditorUrl, EDITOR_LABELS, DEFAULT_EDITORS } from './lib/editor';
import {
  createOverlay,
  positionOverlay,
  positionOverlayByRect,
  hideOverlay,
  removeOverlay,
  updateTooltipText,
} from './lib/overlay';
import {
  createContextMenu,
  showContextMenu,
  hideContextMenu,
  removeContextMenu,
  isContextMenuVisible,
  type MenuAction,
} from './lib/context-menu';
import { inspectFiber } from './lib/fiber-inspect';
import {
  createPreviewPanel,
  showPreviewPanel,
  hidePreviewPanel,
  removePreviewPanel,
} from './lib/preview-panel';
import {
  createAskModal,
  showAskModal,
  hideAskModal,
  removeAskModal,
  isAskModalVisible,
} from './lib/ask-modal';
import { runAskAgent } from './lib/agent-prompt';
import { showToast, removeToast } from './lib/toast';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MODIFIER_KEYS: Record<string, string> = {
  alt: 'Alt',
  ctrl: 'Control',
  meta: 'Meta',
  shift: 'Shift',
};

/**
 * Resolve the original source location for a component Fiber node.
 * Priority: data-locator-source attribute → React 18 _debugSource → React 19 _debugStack + source map.
 */
async function resolveComponentSource(
  fiber: any,
  cache: SourceMapCache,
  projectRoot?: string,
  element?: HTMLElement,
): Promise<ResolvedSource | null> {
  // Fastest path: compile-time injected data-locator-source attribute
  if (element) {
    const attrSource = extractDataLocatorSource(element);
    if (attrSource) return attrSource;
  }

  // Fast path: React 18 _debugSource (synchronous, no fetch needed)
  const debugSource = extractDebugSource(fiber);
  if (debugSource) return debugSource;

  // Slow path: React 19 _debugStack (async, needs source map fetch)
  let stackInfo = extractStackFrame(fiber._debugStack);
  if (!stackInfo) {
    const componentFiber = findNearestComponentFiber(fiber);
    if (componentFiber) {
      stackInfo = extractStackFrame(componentFiber._debugStack);
    }
  }
  if (!stackInfo) return null;

  return resolveSourceMap(
    stackInfo.chunkUrl,
    stackInfo.line,
    stackInfo.column,
    cache,
    projectRoot,
  );
}

/**
 * click-to-agent — Alt(Option)+Click any React component to open its source,
 * or hand it to your AI coding agent with full context.
 *
 * Features:
 * - Alt+Hover: highlights component with name and source file path
 * - Alt+Click: opens the per-component action picker
 * - Alt+Right-click: shows the component hierarchy menu
 * - Each component exposes actions:
 *     - "↗ Open in …": one per configured editor (Go to source)
 *     - "▹ Ask Cursor":    opens Cursor with a rich component-context prompt
 *     - "◎ Ask Claude":    opens Claude Code with a rich component-context prompt
 *     - "⧉ Copy prompt":   copies the component-context prompt to the clipboard
 * - Source map prefetching on modifier key press
 * - React 18 _debugSource fallback
 *
 * Renders nothing (returns null). Only active in development mode.
 * Completely tree-shaken in production builds.
 */
export function Locator(props: LocatorProps = {}) {
  if (process.env.NODE_ENV !== 'development' && props.enabled !== true)
    return null;
  return <LocatorImpl {...props} />;
}

function LocatorImpl({
  editor,
  projectRoot,
  modifier = 'alt',
  enabled,
  highlightColor = '#ef4444',
  showPreview = true,
}: LocatorProps = {}) {
  const isEnabled = enabled ?? true;

  useEffect(() => {
    if (!isEnabled) return;

    console.log('[click-to-agent] v' + __VERSION__ + ' initialized');

    const sourceMapCache: SourceMapCache = new Map();
    const elements = createOverlay(highlightColor);
    const contextMenu = createContextMenu();
    const previewPanel = showPreview ? createPreviewPanel() : null;
    const askModal = createAskModal();
    const modifierKey = MODIFIER_KEYS[modifier] ?? 'Alt';

    let isModifierHeld = false;
    let currentHoverTarget: HTMLElement | null = null;
    let inspectDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    const buildAskContext = (item: ContextMenuItem, element: HTMLElement) => ({
      componentName: item.componentName,
      fiber: item.fiber,
      element,
      filePath: item.filePath,
      line: item.line,
    });

    const editors = editor?.length ? [...new Set(editor)] : DEFAULT_EDITORS;

    /**
     * Build the action set (Open in editor × N / Ask Cursor / Ask Claude /
     * Copy prompt) shared by Alt+Click and Alt+Right-click. `resolveFor`
     * yields the already-resolved source for the chosen item (or null →
     * resolve lazily); `element` is the DOM node the menu was opened from.
     */
    const makeActions = (
      resolveFor: (item: ContextMenuItem) => ResolvedSource | null,
      element: HTMLElement,
    ): MenuAction[] => {
      const openInEditor = (item: ContextMenuItem, targetEditor: EditorProtocol) => {
        const resolved = resolveFor(item);
        const open = (r: ResolvedSource) => {
          window.open(
            buildEditorUrl(
              targetEditor,
              resolveEditorFilePath(r.filePath, projectRoot),
              r.originalLine,
              r.originalColumn,
            ),
            '_self',
          );
        };
        if (resolved) {
          open(resolved);
          return;
        }
        resolveComponentSource(item.fiber, sourceMapCache, projectRoot)
          .then((r) => {
            if (r) open(r);
          })
          .catch((err) =>
            console.warn('[click-to-agent] Source map error:', err),
          );
      };

      const ask = (item: ContextMenuItem, target: 'cursor' | 'claude') => {
        const resolved = resolveFor(item);
        const agentLabel = target === 'cursor' ? 'Cursor' : 'Claude';
        showAskModal(askModal, item.componentName, agentLabel, async (instruction) => {
          await runAskAgent({
            target,
            instruction,
            context: buildAskContext(item, element),
            resolved,
          });
          hideAskModal(askModal);
        });
      };

      const copyPrompt = async (item: ContextMenuItem) => {
        const resolved = resolveFor(item);
        const { copied } = await runAskAgent({
          target: 'copy',
          instruction: '',
          context: buildAskContext(item, element),
          resolved,
        });
        if (copied) {
          showToast('Prompt copied to clipboard');
        } else {
          showToast('Copy failed — see console');
          console.warn('[click-to-agent] clipboard copy failed');
        }
      };

      const editorActions: MenuAction[] = editors.map((targetEditor) => ({
        icon: '↗',
        label: `Open in ${EDITOR_LABELS[targetEditor]}`,
        color: '#cbd5e1',
        hoverBg: 'rgba(255,255,255,0.08)',
        run: (item) => openInEditor(item, targetEditor),
      }));

      return [
        ...editorActions,
        {
          icon: '▹',
          label: 'Ask Cursor',
          color: '#7dd3fc',
          hoverBg: 'rgba(56,189,248,0.15)',
          run: (item) => ask(item, 'cursor'),
        },
        {
          icon: '◎',
          label: 'Ask Claude',
          color: '#a78bfa',
          hoverBg: 'rgba(139,92,246,0.15)',
          run: (item) => ask(item, 'claude'),
        },
        {
          icon: '⧉',
          label: 'Copy prompt',
          color: '#cbd5e1',
          hoverBg: 'rgba(255,255,255,0.08)',
          run: copyPrompt,
        },
      ];
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === modifierKey) {
        isModifierHeld = true;
        document.body.style.cursor = 'crosshair';

        // Prefetch source maps for visible elements (non-blocking)
        const urls = collectVisibleChunkUrls();
        for (const url of urls) {
          prefetchSourceMap(url, sourceMapCache);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === modifierKey) {
        isModifierHeld = false;
        hideOverlay(elements);
        hideContextMenu(contextMenu);
        if (previewPanel) hidePreviewPanel(previewPanel);
        if (inspectDebounceTimer) clearTimeout(inspectDebounceTimer);
        document.body.style.cursor = '';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isModifierHeld) return;
      // Don't interfere while modal is open
      if (isAskModalVisible(askModal)) return;
      // Don't move overlay while context menu is open
      if (isContextMenuVisible(contextMenu)) return;

      const target = document.elementFromPoint(
        e.clientX,
        e.clientY,
      ) as HTMLElement;
      if (
        !target ||
        target === elements.overlay ||
        target === elements.tooltip ||
        contextMenu.container.contains(target)
      )
        return;

      const fiber = getFiberFromElement(target);
      const componentFiber = fiber ? findNearestComponentFiber(fiber) : null;
      const name = componentFiber ? getComponentName(componentFiber) : null;

      // Show component name immediately
      positionOverlay(elements, target, name);

      // Async: resolve file path and update tooltip
      if (name && componentFiber) {
        currentHoverTarget = target;

        resolveComponentSource(componentFiber, sourceMapCache, projectRoot, target)
          .then((resolved) => {
            if (currentHoverTarget !== target) return; // stale
            if (resolved) {
              const relativePath = toRelativePath(
                resolved.filePath,
                projectRoot,
              );
              updateTooltipText(
                elements,
                `<${name}> \u2014 ${relativePath}:${resolved.originalLine}`,
              );
            }
          })
          .catch(() => {
            /* keep showing name only */
          });

        // Debounced preview panel: inspect fiber props/state
        if (previewPanel) {
          if (inspectDebounceTimer) clearTimeout(inspectDebounceTimer);
          inspectDebounceTimer = setTimeout(() => {
            if (currentHoverTarget !== target) return; // stale
            const inspection = inspectFiber(componentFiber);
            const targetRect = target.getBoundingClientRect();
            const tooltipRect = elements.tooltip.getBoundingClientRect();
            showPreviewPanel(previewPanel, targetRect, tooltipRect, inspection);
          }, 150);
        }
      } else if (previewPanel) {
        hidePreviewPanel(previewPanel);
      }
    };

    const handleClick = async (e: MouseEvent) => {
      // If modal is open, let its own event handlers work; dismiss on outside click
      if (isAskModalVisible(askModal)) {
        if (!askModal.overlay.contains(e.target as Node)) {
          hideAskModal(askModal);
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      // If context menu is open, handle clicks
      if (isContextMenuVisible(contextMenu)) {
        if (contextMenu.container.contains(e.target as Node)) {
          // Inside menu click → let row click handler process it
          return;
        }
        // Outside menu click → dismiss menu
        hideContextMenu(contextMenu);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (!isModifierHeld) return;

      e.preventDefault();
      e.stopPropagation();
      if (previewPanel) hidePreviewPanel(previewPanel);

      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (!target) return;

      const fiber = getFiberFromElement(target);
      if (!fiber) return;

      // Resolve the nearest user component for Alt+click (single component, jump to action picker)
      const componentFiber = findNearestComponentFiber(fiber);
      let resolved = await resolveComponentSource(fiber, sourceMapCache, projectRoot, target);
      if (!resolved && componentFiber) {
        resolved = await resolveComponentSource(componentFiber, sourceMapCache, projectRoot, target);
      }
      if (!resolved || resolved.filePath.includes('node_modules')) return;
      if (!isModifierHeld) return;

      // Prefer the component fiber when present (used for name, props, hooks)
      const inspectionFiber = componentFiber ?? fiber;
      const componentName = getComponentName(inspectionFiber) ?? 'Unknown';
      const item: ContextMenuItem = {
        componentName,
        fiber: inspectionFiber,
        filePath: toRelativePath(resolved.filePath, projectRoot),
        line: resolved.originalLine,
      };

      const capturedResolved = resolved;

      showContextMenu(
        contextMenu,
        e.clientX,
        e.clientY,
        [item],
        makeActions(() => capturedResolved, target),
        item, // skipToAction → jump straight to the action picker
      );
    };

    const handleContextMenu = async (e: MouseEvent) => {
      if (!isModifierHeld) return;

      e.preventDefault();
      e.stopPropagation();
      // Cancel any pending hover-preview so its debounce can't re-open the
      // panel on top of the menu we're about to show.
      if (inspectDebounceTimer) clearTimeout(inspectDebounceTimer);
      if (previewPanel) hidePreviewPanel(previewPanel);

      const target = document.elementFromPoint(
        e.clientX,
        e.clientY,
      ) as HTMLElement;
      if (!target) return;

      const fiber = getFiberFromElement(target);
      if (!fiber) return;

      const ancestry = collectComponentAncestry(fiber);
      if (ancestry.length === 0) return;

      const componentFiber = findNearestComponentFiber(fiber);

      // Resolve all sources in parallel — source maps are prefetched on modifier keydown.
      // Parent component fibers often lack _debugStack in React 19; for the nearest
      // user component, fall back to the same target-based resolution Alt+Click uses.
      const resolvedEntries = await Promise.all(
        ancestry.map(async ({ fiber: f, name }) => {
          let resolved = await resolveComponentSource(
            f,
            sourceMapCache,
            projectRoot,
          ).catch(() => null);
          if (!resolved && componentFiber && f === componentFiber) {
            resolved =
              (await resolveComponentSource(
                fiber,
                sourceMapCache,
                projectRoot,
                target,
              ).catch(() => null)) ??
              (await resolveComponentSource(
                componentFiber,
                sourceMapCache,
                projectRoot,
                target,
              ).catch(() => null));
          }
          return { fiber: f, name, resolved };
        }),
      );

      // Guard: user may have released modifier key while resolving
      if (!isModifierHeld) return;

      // Keep only components that resolve to user source. This drops framework
      // internals (e.g. Next.js SegmentViewNode / *Boundary) that either fail to
      // resolve or live in node_modules, leaving a clean user-component hierarchy.
      let userEntries = resolvedEntries.filter(
        ({ resolved }) =>
          resolved != null && !resolved.filePath.includes('node_modules'),
      );

      // Last resort: if every ancestor failed (common on React 19 + Vite/Start when
      // only the clicked DOM fiber carries _debugStack), show a single-item menu
      // using the same resolution path as Alt+Click.
      if (userEntries.length === 0) {
        const fallback =
          (await resolveComponentSource(
            fiber,
            sourceMapCache,
            projectRoot,
            target,
          ).catch(() => null)) ??
          (componentFiber
            ? await resolveComponentSource(
                componentFiber,
                sourceMapCache,
                projectRoot,
                target,
              ).catch(() => null)
            : null);
        if (!fallback || fallback.filePath.includes('node_modules')) return;
        const name =
          (componentFiber && getComponentName(componentFiber)) ?? 'Unknown';
        userEntries = [
          { fiber: componentFiber ?? fiber, name, resolved: fallback },
        ];
      }

      const capturedTarget = target;

      const items: ContextMenuItem[] = userEntries.map(
        ({ fiber: f, name, resolved }) => ({
          componentName: name,
          fiber: f,
          filePath: resolved
            ? toRelativePath(resolved.filePath, projectRoot)
            : undefined,
          line: resolved?.originalLine,
        }),
      );

      showContextMenu(
        contextMenu,
        e.clientX,
        e.clientY,
        items,
        makeActions(
          (item) =>
            userEntries.find((en) => en.fiber === item.fiber)?.resolved ?? null,
          capturedTarget,
        ),
        undefined, // skipToAction
        // onHover — move the overlay onto the hovered ancestor
        (item) => {
          const rect = getFiberBoundingRect(item.fiber);
          if (rect) positionOverlayByRect(elements, rect, item.componentName);
        },
        // onLeave — hide the overlay when the pointer leaves the menu
        () => { hideOverlay(elements); },
      );
    };

    const handleBlur = () => {
      isModifierHeld = false;
      hideOverlay(elements);
      hideContextMenu(contextMenu);
      if (previewPanel) hidePreviewPanel(previewPanel);
      if (inspectDebounceTimer) clearTimeout(inspectDebounceTimer);
      document.body.style.cursor = '';
    };

    // Register listeners on capture phase to intercept before app handlers
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('blur', handleBlur);
      removeOverlay(elements);
      removeContextMenu(contextMenu);
      removeAskModal(askModal);
      removeToast();
      if (previewPanel) removePreviewPanel(previewPanel);
      if (inspectDebounceTimer) clearTimeout(inspectDebounceTimer);
      document.body.style.cursor = '';
    };
  }, [isEnabled, editor, projectRoot, modifier, highlightColor, showPreview]);

  return null;
}
