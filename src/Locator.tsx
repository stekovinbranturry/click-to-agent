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

async function resolveComponentSource(
  fiber: any,
  cache: SourceMapCache,
  projectRoot?: string,
  element?: HTMLElement,
): Promise<ResolvedSource | null> {
  if (element) {
    const attrSource = extractDataLocatorSource(element);
    if (attrSource) return attrSource;
  }

  const debugSource = extractDebugSource(fiber);
  if (debugSource) return debugSource;

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
 * Included in app bundles only when `process.env.NODE_ENV === 'development'`
 * (see package entry). Mount as high in the tree as possible.
 */
export function Locator({
  editor,
  projectRoot,
  modifier = 'alt',
  highlightColor = '#ef4444',
  showPreview = true,
}: LocatorProps = {}) {
  useEffect(() => {
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
      if (isAskModalVisible(askModal)) return;
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

      positionOverlay(elements, target, name);

      if (name && componentFiber) {
        currentHoverTarget = target;

        resolveComponentSource(componentFiber, sourceMapCache, projectRoot, target)
          .then((resolved) => {
            if (currentHoverTarget !== target) return;
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

        if (previewPanel) {
          if (inspectDebounceTimer) clearTimeout(inspectDebounceTimer);
          inspectDebounceTimer = setTimeout(() => {
            if (currentHoverTarget !== target) return;
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
      if (isAskModalVisible(askModal)) {
        if (!askModal.overlay.contains(e.target as Node)) {
          hideAskModal(askModal);
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      if (isContextMenuVisible(contextMenu)) {
        if (contextMenu.container.contains(e.target as Node)) {
          return;
        }
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

      const componentFiber = findNearestComponentFiber(fiber);
      let resolved = await resolveComponentSource(fiber, sourceMapCache, projectRoot, target);
      if (!resolved && componentFiber) {
        resolved = await resolveComponentSource(componentFiber, sourceMapCache, projectRoot, target);
      }
      if (!resolved || resolved.filePath.includes('node_modules')) return;
      if (!isModifierHeld) return;

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
        item,
      );
    };

    const handleContextMenu = async (e: MouseEvent) => {
      if (!isModifierHeld) return;

      e.preventDefault();
      e.stopPropagation();
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

      if (!isModifierHeld) return;

      let userEntries = resolvedEntries.filter(
        ({ resolved }) =>
          resolved != null && !resolved.filePath.includes('node_modules'),
      );

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
        undefined,
        (item) => {
          const rect = getFiberBoundingRect(item.fiber);
          if (rect) positionOverlayByRect(elements, rect, item.componentName);
        },
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
  }, [editor, projectRoot, modifier, highlightColor, showPreview]);

  return null;
}
