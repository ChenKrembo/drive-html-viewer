// DOM updates for the host page. No network or auth logic.

function getElement(id) {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

/**
 * @param {{title: string, message: string, actionLabel?: string, onAction?: () => void}} panel
 */
export function showPanel({ title, message, actionLabel, onAction }) {
  getElement('panel-title').textContent = title;
  getElement('panel-message').textContent = message;

  const actionButton = getElement('panel-action');
  actionButton.hidden = actionLabel === undefined;
  actionButton.textContent = actionLabel ?? '';
  actionButton.onclick = onAction ?? null;

  getElement('viewer').hidden = true;
  getElement('toolbar').hidden = true;
  getElement('panel').hidden = false;
}

/** @param {{name: string, webViewLink?: string}} file */
export function showViewer(file) {
  document.title = file.name;
  getElement('file-name').textContent = file.name;

  const driveLink = getElement('drive-link');
  driveLink.hidden = !file.webViewLink;
  if (file.webViewLink) {
    driveLink.href = file.webViewLink;
  }

  const toolbar = getElement('toolbar');
  getElement('hide-toolbar').onclick = () => {
    toolbar.hidden = true;
  };

  getElement('panel').hidden = true;
  toolbar.hidden = false;
  const viewer = getElement('viewer');
  viewer.hidden = false;
  return viewer;
}
