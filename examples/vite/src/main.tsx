import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Locator } from 'click-to-agent';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Dev-only. Try editor="cursor" to make "Go to source" open Cursor. */}
    <Locator enabled={import.meta.env.DEV} />
  </StrictMode>,
);
