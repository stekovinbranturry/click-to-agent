'use client';

import type { ReactNode } from 'react';

interface CounterButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

export function CounterButton({ label, onClick, children }: CounterButtonProps) {
  return (
    <button type="button" onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}
