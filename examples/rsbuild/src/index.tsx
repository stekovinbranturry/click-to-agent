import React from 'react';
import ReactDOM from 'react-dom/client';
import { Locator } from 'click-to-agent';
import App from './App';

declare const __PROJECT_ROOT__: string;

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
      {import.meta.env.DEV && (
        <Locator editor="cursor" projectRoot={__PROJECT_ROOT__} />
      )}
    </React.StrictMode>,
  );
}
