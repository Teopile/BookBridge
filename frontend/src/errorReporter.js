// Tiny, dependency-free global error reporter.
//
// Activates ONLY when VITE_ERROR_WEBHOOK is set at build time. Otherwise it is a
// complete no-op — nothing is attached, nothing is posted. This intentionally
// avoids adding @sentry/* (heavy dep); it just forwards uncaught errors and
// rejected promises to a configurable webhook (e.g. a Sentry "store" endpoint,
// a serverless function, or any log sink).
//
// Keep this small and best-effort: it must never throw or block the app.

const WEBHOOK = import.meta.env.VITE_ERROR_WEBHOOK;

function post(payload) {
  try {
    // keepalive lets the request survive a page unload after a fatal error.
    fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      mode: 'cors',
    }).catch(() => {});
  } catch {
    // Never let the reporter itself break the page.
  }
}

export function initErrorReporter() {
  if (!WEBHOOK) return; // no-op when unconfigured

  window.addEventListener('error', (e) => {
    post({
      kind: 'error',
      message: e.message,
      source: e.filename,
      line: e.lineno,
      stack: e.error?.stack,
      url: location.href,
      ts: new Date().toISOString(),
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    post({
      kind: 'unhandledrejection',
      message: reason?.message || String(reason),
      stack: reason?.stack,
      url: location.href,
      ts: new Date().toISOString(),
    });
  });
}
