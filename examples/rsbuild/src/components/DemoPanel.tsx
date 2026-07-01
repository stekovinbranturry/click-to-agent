import { Counter } from './Counter';

export function DemoPanel() {
  return (
    <section className="counter-section">
      <h2>Stateful component (try Alt+Right-click on the + button)</h2>
      <Counter label="Demo counter" initial={3} />
    </section>
  );
}
