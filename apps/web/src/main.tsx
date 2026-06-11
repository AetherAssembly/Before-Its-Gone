import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n.js';
import App from './App';
import { ToastProvider } from './Toast.js';

if ('serviceWorker' in navigator && !('electronAPI' in window)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* silently ignore in dev */});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);

requestAnimationFrame(() => {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.classList.add('splash--hidden');
  splash.addEventListener('transitionend', () => splash.remove(), { once: true });
});
