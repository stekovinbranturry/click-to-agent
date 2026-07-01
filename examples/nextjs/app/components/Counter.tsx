'use client';

import { useState } from 'react';
import { CounterButton } from './CounterButton';

interface CounterProps {
  label: string;
  initial?: number;
}

export function Counter({ label, initial = 0 }: CounterProps) {
  const [count, setCount] = useState(initial);

  return (
    <div className="counter">
      <span className="counter-label">{label}</span>
      <div className="counter-controls">
        <CounterButton label="decrement" onClick={() => setCount((c) => c - 1)}>
          −
        </CounterButton>
        <output className="counter-value">{count}</output>
        <CounterButton label="increment" onClick={() => setCount((c) => c + 1)}>
          +
        </CounterButton>
      </div>
    </div>
  );
}
