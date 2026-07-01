import './App.css';
import { DemoPanel } from './components/DemoPanel';

const App = () => {
  return (
    <main className="page">
      <header className="hero">
        <span className="badge">click-to-agent · Rsbuild</span>
        <h1>
          Hold <kbd>Alt</kbd>/<kbd>Option</kbd> and interact with any component
        </h1>
        <p className="subtitle">
          <strong>Alt + Hover</strong> to highlight ·{' '}
          <strong>Alt + Click</strong> for the action picker ·{' '}
          <strong>Alt + Right-click</strong> for the component hierarchy.
        </p>
      </header>

      <DemoPanel />
    </main>
  );
};

export default App;
