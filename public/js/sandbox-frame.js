// Runs inside sandbox.html. Waits for the host page to send the HTML,
// then replaces this document with it.
(() => {
  // location.origin reflects the URL; the frame's actual origin is opaque.
  const hostOrigin = window.location.origin;

  function renderHtml(html) {
    document.open();
    document.write(html);
    document.close();
  }

  function handleMessage(event) {
    const isFromHost = event.source === window.parent && event.origin === hostOrigin;
    if (!isFromHost || event.data?.type !== 'render-html') {
      return;
    }
    window.removeEventListener('message', handleMessage);
    renderHtml(String(event.data.html));
  }

  if (window.parent === window) {
    return;
  }
  window.addEventListener('message', handleMessage);
  window.parent.postMessage({ type: 'sandbox-ready' }, hostOrigin);
})();
