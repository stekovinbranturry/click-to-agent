import { useState } from 'react';

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
        <button onClick={() => setCount((c) => c - 1)} aria-label="decrement">
          −
        </button>
        <output className="counter-value">{count}</output>
        <button onClick={() => setCount((c) => c + 1)} aria-label="increment">
          +
        </button>
      </div>
    </div>
  );
}
