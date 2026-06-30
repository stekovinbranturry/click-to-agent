import { Counter } from './components/Counter';
import { FeatureCard } from './components/FeatureCard';

export default function Home() {
  return (
    <main className="page">
      <header className="hero">
        <span className="badge">click-to-agent</span>
        <h1>
          Hold <kbd>Alt</kbd>/<kbd>Option</kbd> and interact with any component
        </h1>
        <p className="subtitle">
          <strong>Alt + Hover</strong> to highlight ·{' '}
          <strong>Alt + Click</strong> for the action picker ·{' '}
          <strong>Alt + Right-click</strong> for the component hierarchy.
        </p>
      </header>

      <section className="grid">
        <FeatureCard
          title="Go to source"
          icon="↗"
          description="Open this card's source file at the exact line in your editor."
        />
        <FeatureCard
          title="Ask Cursor"
          icon="▹"
          description="Send this component (props + DOM + CSS) to Cursor with one click."
        />
        <FeatureCard
          title="Ask Claude"
          icon="◎"
          description="Hand the same rich context to Claude Code."
        />
        <FeatureCard
          title="Copy prompt"
          icon="⧉"
          description="Copy the full component prompt to your clipboard."
        />
      </section>

      <section className="counter-section">
        <h2>Stateful component (try the props/state preview)</h2>
        <Counter label="Demo counter" initial={3} />
      </section>
    </main>
  );
}
