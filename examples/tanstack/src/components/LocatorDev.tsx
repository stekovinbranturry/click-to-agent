'use client';

import { Locator } from 'click-to-agent';

declare const __PROJECT_ROOT__: string;

/** Dev-only click-to-agent overlay. Client boundary for TanStack Start SSR. */
export function LocatorDev() {
  if (!import.meta.env.DEV) return null;
  return <Locator projectRoot={__PROJECT_ROOT__} />;
}
