import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { initErrorReporter } from './errorReporter.js';
import './styles/global.css';

// Env-gated, dependency-free error reporting. No-op unless VITE_ERROR_WEBHOOK is set.
initErrorReporter();

// Direction F motion layer (vanilla, no dependency). Adds `html.js` so the
// CSS scroll-reveal / draw-on states activate, then toggles `.is-in` as
// `.reveal`/`.trail`/`.stamp` elements enter the viewport. Skipped entirely
// when the user prefers reduced motion — CSS already defaults to fully visible,
// so the look still lands without JS.
function initTrailMotion() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  document.documentElement.classList.add('js');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );

  // observe() on an already-observed element is a no-op, so re-scanning is safe.
  const observeAll = () => {
    document.querySelectorAll('.reveal, .trail, .stamp').forEach((el) => observer.observe(el));
  };

  // Debounced re-scan so a burst of React mutations triggers a single pass.
  let scheduled = false;
  const rescan = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; observeAll(); });
  };

  rescan();
  window.addEventListener('popstate', rescan);
  // MutationObserver catches React route swaps without touching router internals.
  if ('MutationObserver' in window) {
    new MutationObserver(rescan).observe(document.body, { childList: true, subtree: true });
  }
}
initTrailMotion();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
