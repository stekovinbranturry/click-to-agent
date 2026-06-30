let toastEl: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

/** Show a brief, auto-dismissing toast at the bottom-center of the viewport. */
export function showToast(message: string, durationMs = 1800): void {
  if (typeof document === 'undefined') return;

  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.style.cssText = `
      position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%) translateY(8px);
      z-index: 300000; background: #1e293b; color: #f8fafc;
      border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;
      padding: 9px 16px; font-size: 13px; font-family: ui-monospace, monospace;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45); pointer-events: none;
      opacity: 0; transition: opacity 0.15s ease, transform 0.15s ease;
    `;
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = message;

  // Force reflow so the enter transition runs even on rapid successive calls
  void toastEl.offsetWidth;
  toastEl.style.opacity = '1';
  toastEl.style.transform = 'translateX(-50%) translateY(0)';

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (!toastEl) return;
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(-50%) translateY(8px)';
  }, durationMs);
}

/** Remove the toast element from the DOM (cleanup). */
export function removeToast(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (toastEl) {
    toastEl.remove();
    toastEl = null;
  }
}
