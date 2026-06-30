import type { AgentTarget, AskContext, FiberInspection, ResolvedSource } from '../types';
import { inspectFiber } from './fiber-inspect';

/* eslint-disable @typescript-eslint/no-explicit-any */

const CSS_PROPS = [
  'display', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems',
  'alignSelf', 'gap', 'rowGap', 'columnGap', 'gridTemplateColumns',
  'gridTemplateRows', 'width', 'height', 'minWidth', 'minHeight',
  'maxWidth', 'maxHeight', 'padding', 'paddingTop', 'paddingRight',
  'paddingBottom', 'paddingLeft', 'margin', 'marginTop', 'marginRight',
  'marginBottom', 'marginLeft', 'color', 'fontSize', 'fontWeight',
  'fontFamily', 'lineHeight', 'textAlign', 'letterSpacing',
  'background', 'backgroundColor', 'border', 'borderRadius', 'boxShadow',
  'position', 'top', 'left', 'right', 'bottom', 'zIndex',
  'overflow', 'overflowX', 'overflowY', 'transform', 'opacity',
  'cursor', 'pointerEvents',
] as const;

/** Max encoded length for deeplink-based agents (Cursor / Claude Code) */
const URL_PROMPT_LIMIT = 28000;

/** Truncate outerHTML to a safe length for inclusion in a URI prompt */
export function truncateHtml(html: string, maxLen = 8000): string {
  if (html.length <= maxLen) return html;
  return html.slice(0, maxLen) + '\n<!-- ... truncated -->';
}

/** Serialize key computed CSS properties of an element */
export function collectComputedCss(element: HTMLElement): string {
  try {
    const style = window.getComputedStyle(element);
    const lines: string[] = [];
    for (const prop of CSS_PROPS) {
      const value = style.getPropertyValue(
        prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
      );
      if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== '0px') {
        lines.push(`  ${prop}: ${value};`);
      }
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

interface PromptParams {
  userInstruction: string;
  componentName: string;
  filePath: string;
  line: number;
  inspection: FiberInspection;
  outerHtml: string;
  computedCss: string;
}

function serializeInspection(inspection: FiberInspection): {
  propsJson: string | null;
  stateJson: string | null;
} {
  let propsJson: string | null = null;
  let stateJson: string | null = null;

  if (inspection.props.length > 0) {
    const obj: Record<string, string> = {};
    for (const p of inspection.props) obj[p.key] = p.value.display;
    propsJson = JSON.stringify(obj, null, 2);
  }

  if (inspection.isClassComponent && inspection.classState && inspection.classState.length > 0) {
    const obj: Record<string, string> = {};
    for (const p of inspection.classState) obj[p.key] = p.value.display;
    stateJson = JSON.stringify(obj, null, 2);
  } else if (!inspection.isClassComponent && inspection.hooks.length > 0) {
    const obj: Record<string, string> = {};
    // Count occurrences of each hook type for numbering (useState#0, useState#1, ...)
    const typeCounts: Record<string, number> = {};
    for (const h of inspection.hooks) {
      const count = typeCounts[h.hookType] ?? 0;
      typeCounts[h.hookType] = count + 1;
    }
    const typeIndices: Record<string, number> = {};
    for (const h of inspection.hooks) {
      const idx = typeIndices[h.hookType] ?? 0;
      typeIndices[h.hookType] = idx + 1;
      const key = (typeCounts[h.hookType] ?? 0) > 1
        ? `${h.hookType}#${idx}`
        : h.hookType;
      obj[key] = h.value.display;
    }
    stateJson = JSON.stringify(obj, null, 2);
  }

  return { propsJson, stateJson };
}

/** Build the structured markdown prompt sent to the coding agent */
export function buildAgentPrompt(params: PromptParams): string {
  const {
    userInstruction,
    componentName,
    filePath,
    line,
    inspection,
    outerHtml,
    computedCss,
  } = params;

  const { propsJson, stateJson } = serializeInspection(inspection);

  const sections: string[] = [];

  sections.push('# UI component change request');
  sections.push(`## Instruction\n${userInstruction || '(no instruction provided)'}`);
  sections.push(
    `## Component\n- Component: <${componentName}>\n- File: ${filePath}\n- Line: ${line}`,
  );

  if (propsJson) {
    sections.push(`## Props\n\`\`\`json\n${propsJson}\n\`\`\``);
  }

  if (stateJson) {
    sections.push(`## State / Hooks\n\`\`\`json\n${stateJson}\n\`\`\``);
  }

  if (outerHtml) {
    sections.push(`## DOM HTML (rendered output)\n\`\`\`html\n${outerHtml}\n\`\`\``);
  }

  if (computedCss) {
    sections.push(`## Computed CSS (key styles)\n\`\`\`css\n${computedCss}\n\`\`\``);
  }

  return sections.join('\n\n');
}

/** Open Cursor with a pre-filled agent prompt via the Cursor deeplink */
export function openCursorWithPrompt(prompt: string): void {
  const encoded = encodeURIComponent(prompt);
  window.open(
    `cursor://anysphere.cursor-deeplink/prompt?text=${encoded}`,
    '_self',
  );
}

/** Open Claude Code with a pre-filled prompt */
export function openClaudeWithPrompt(prompt: string): void {
  const encoded = encodeURIComponent(prompt);
  window.open(`vscode://anthropic.claude-code/open?prompt=${encoded}`, '_self');
}

/** Copy text to the clipboard, with a legacy fallback. Returns success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Collect context and build the markdown prompt for a component. */
function buildPromptFromContext(
  instruction: string,
  context: AskContext,
  resolved: ResolvedSource | null,
  enforceUrlLimit: boolean,
): string {
  const filePath = resolved?.filePath ?? context.filePath ?? '(unknown)';
  const line = resolved?.originalLine ?? context.line ?? 0;

  const inspection: FiberInspection = inspectFiber(context.fiber);

  let outerHtml = '';
  try {
    outerHtml = truncateHtml(context.element.outerHTML);
  } catch {
    // element detached — skip
  }

  let computedCss = '';
  try {
    computedCss = collectComputedCss(context.element);
  } catch {
    // skip
  }

  let prompt = buildAgentPrompt({
    userInstruction: instruction,
    componentName: context.componentName,
    filePath,
    line,
    inspection,
    outerHtml,
    computedCss,
  });

  if (!enforceUrlLimit) return prompt;

  // Deeplink targets have a practical URL length cap — shrink, then drop HTML.
  if (encodeURIComponent(prompt).length > URL_PROMPT_LIMIT) {
    let smallerHtml = '';
    try {
      smallerHtml = truncateHtml(context.element.outerHTML, 4000);
    } catch {
      // skip
    }
    prompt = buildAgentPrompt({
      userInstruction: instruction,
      componentName: context.componentName,
      filePath,
      line,
      inspection,
      outerHtml: smallerHtml,
      computedCss,
    });
  }

  if (encodeURIComponent(prompt).length > URL_PROMPT_LIMIT) {
    prompt = buildAgentPrompt({
      userInstruction: instruction,
      componentName: context.componentName,
      filePath,
      line,
      inspection,
      outerHtml: '',
      computedCss,
    });
  }

  return prompt;
}

/**
 * Main orchestration: collect context, build a prompt, and dispatch it to the
 * chosen agent target.
 *
 * - `cursor` / `claude` open the editor via deeplink (URL length enforced)
 * - `copy` writes the full prompt to the clipboard
 *
 * Returns the prompt string (useful for the `copy` target).
 */
export async function runAskAgent(params: {
  target: AgentTarget;
  instruction: string;
  context: AskContext;
  resolved: ResolvedSource | null;
}): Promise<{ prompt: string; copied?: boolean }> {
  const { target, instruction, context, resolved } = params;
  const enforceUrlLimit = target !== 'copy';
  const prompt = buildPromptFromContext(instruction, context, resolved, enforceUrlLimit);

  if (target === 'copy') {
    const copied = await copyToClipboard(prompt);
    return { prompt, copied };
  }

  if (target === 'cursor') {
    openCursorWithPrompt(prompt);
    return { prompt };
  }

  openClaudeWithPrompt(prompt);
  return { prompt };
}
