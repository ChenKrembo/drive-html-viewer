import { renderHtml } from '/js/viewer.js';

const PROBE_TIMEOUT_MS = 5000;
const HOST_SECRET = 'host-secret-value';

// Runs inside the sandboxed frame as the "untrusted file".
const UNTRUSTED_HTML = `<!doctype html>
<html>
  <head>
    <title>probe</title>
    <style>body { background: rgb(255, 238, 238); }</style>
  </head>
  <body>
    <h1 id="heading">static</h1>
    <script>
      function attempt(action) {
        try { return String(action()); } catch (error) { return 'BLOCKED:' + error.name; }
      }
      const report = {
        inlineScriptRan: true,
        selfOrigin: self.origin,
        parentSessionStorage: attempt(() => window.parent.sessionStorage.getItem('probe-secret')),
        parentDocument: attempt(() => window.parent.document.title),
        ownSessionStorage: attempt(() => window.sessionStorage.length),
        ownCookie: attempt(() => document.cookie),
        inlineStyleApplied: getComputedStyle(document.body).backgroundColor,
      };
      document.getElementById('heading').textContent = 'script ran';
      window.parent.postMessage({ type: 'probe-report', report }, '*');
    </script>
  </body>
</html>`;

function waitForReport() {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve({ error: 'timeout' }), PROBE_TIMEOUT_MS);
    window.addEventListener('message', (event) => {
      if (event.data?.type !== 'probe-report') {
        return;
      }
      clearTimeout(timeoutId);
      resolve({ eventOrigin: event.origin, ...event.data.report });
    });
  });
}

async function runProbe() {
  sessionStorage.setItem('probe-secret', HOST_SECRET);
  const report = waitForReport();
  try {
    await renderHtml(document.getElementById('viewer'), { html: UNTRUSTED_HTML, title: 'probe' });
    return await report;
  } catch (error) {
    return { error: `${error.name}: ${error.message}` };
  }
}

document.getElementById('result').textContent = JSON.stringify(await runProbe(), null, 2);
