'use client';

import type { ReactElement } from 'react';
import * as LocatorModule from './Locator';
import type { LocatorProps } from './types';

export const Locator: (props?: LocatorProps) => ReactElement | null =
  process.env.NODE_ENV !== 'development'
    ? function Locator() {
        return null;
      }
    : LocatorModule.Locator;

export type {
  LocatorProps,
  EditorProtocol,
  FiberInspection,
  PropEntry,
  HookEntry,
  SerializedValue,
} from './types';
