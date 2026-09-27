// Renders untrusted HTML inside a sandboxed, opaque-origin iframe.

const SANDBOX_PAGE_URL = 'sandbox.html';
const SANDBOX_READY_TIMEOUT_MS = 10 * 1000;

// allow-same-origin is intentionally absent: with it, the viewed file would
// share this page's origin and could read the OAuth token.
// allow-top-navigation and allow-popups-to-escape-sandbox are absent so the
// viewed file cannot replace this tab or open unsandboxed windows.
const SANDBOX_PERMISSIONS = [
  'allow-scripts',
  'allow-forms',
  'allow-modals',
  'allow-popups',
  'allow-downloads',
].join(' ');

export class ViewerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ViewerError';
  }
}

function createSandboxFrame(title) {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', SANDBOX_PERMISSIONS);
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.title = title;
  frame.className = 'viewer-frame';
  frame.src = SANDBOX_PAGE_URL;
  return frame;
}

function waitForSandboxReady(frame) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new ViewerError('Sandbox frame did not become ready'));
    }, SANDBOX_READY_TIMEOUT_MS);

    function handleMessage(event) {
      // Opaque-origin frames report origin "null"; identity is checked by source.
      const isFromFrame = event.source === frame.contentWindow && event.origin === 'null';
      if (!isFromFrame || event.data?.type !== 'sandbox-ready') {
        return;
      }
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
      resolve();
    }

    window.addEventListener('message', handleMessage);
  });
}

/**
 * @param {HTMLElement} container
 * @param {{html: string, title: string}} content
 */
export async function renderHtml(container, { html, title }) {
  const frame = createSandboxFrame(title);
  const sandboxReady = waitForSandboxReady(frame);
  container.replaceChildren(frame);
  await sandboxReady;
  // Target origin must be "*": an opaque origin cannot be named.
  frame.contentWindow.postMessage({ type: 'render-html', html }, '*');
}
