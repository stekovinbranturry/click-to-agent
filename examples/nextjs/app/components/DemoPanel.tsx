'use client';

import { Counter } from './Counter';

export function DemoPanel() {
  return (
    <div className="demo-panel">
      <h2>Stateful component (try the props/state preview)</h2>
      <Counter label="Demo counter" initial={3} />
    </div>
  );
}
