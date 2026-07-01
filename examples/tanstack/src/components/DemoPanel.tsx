'use client';

import { Counter } from './Counter';

export function DemoPanel() {
  return (
    <section className="counter-section island-shell mt-8 rounded-2xl p-6 text-center">
      <h2 className="mb-5 text-base font-semibold text-[var(--sea-ink)]">
        Stateful component (try Alt+Right-click on the + button)
      </h2>
      <Counter label="Demo counter" initial={3} />
    </section>
  );
}
