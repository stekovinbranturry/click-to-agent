import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Locator } from 'click-to-agent';
import { App } from './App';
import './index.css';

declare const __PROJECT_ROOT__: string;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Dev-only. projectRoot lets "Go to source" resolve absolute paths on Vite. */}
    <Locator enabled={import.meta.env.DEV} editor="cursor" projectRoot={__PROJECT_ROOT__} />
  </StrictMode>,
);
