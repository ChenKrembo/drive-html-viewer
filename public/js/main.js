import { AuthError, clearCachedToken, getAccessToken, isPopupBlocked } from './auth.js';
import { decodeHtml } from './charset.js';
import { MAX_FILE_SIZE_BYTES, isClientIdConfigured } from './config.js';
import { DriveApiError, fetchFileBytes, fetchFileMetadata } from './drive.js';
import { DriveStateError, parseDriveState } from './state.js';
import { showPanel, showViewer } from './ui.js';
import { renderHtml } from './viewer.js';

const GIS_LOAD_TIMEOUT_MS = 10 * 1000;
const GIS_POLL_INTERVAL_MS = 50;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;

function waitForGoogleIdentityServices() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + GIS_LOAD_TIMEOUT_MS;
    const poll = () => {
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new AuthError('gis_not_loaded', 'Google Identity Services failed to load'));
        return;
      }
      setTimeout(poll, GIS_POLL_INTERVAL_MS);
    };
    poll();
  });
}

function describeError(error) {
  if (error instanceof DriveApiError && error.status === HTTP_NOT_FOUND) {
    return 'File not found for this Google account. Retry to pick the account that owns the file.';
  }
  if (error instanceof DriveApiError || error instanceof AuthError || error instanceof DriveStateError) {
    return error.message;
  }
  return 'Unexpected error. See the browser console for details.';
}

async function loadFile(driveState, accessToken) {
  const fileId = driveState.fileIds[0];
  const request = { fileId, accessToken, resourceKey: driveState.resourceKeys[fileId] };

  const metadata = await fetchFileMetadata(request);
  if (Number(metadata.size) > MAX_FILE_SIZE_BYTES) {
    throw new DriveApiError(413, `File is larger than ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`);
  }
  const bytes = await fetchFileBytes(request);
  return { metadata, html: decodeHtml(bytes) };
}

async function openFile(driveState, prompt) {
  showPanel({ title: 'Opening…', message: 'Loading file from Google Drive.' });
  const accessToken = await getAccessToken({ userId: driveState.userId, prompt });
  const { metadata, html } = await loadFile(driveState, accessToken);
  const viewer = showViewer(metadata);
  await renderHtml(viewer, { html, title: metadata.name });
}

function handleOpenFailure(error, driveState) {
  console.error(error);
  if (error instanceof DriveApiError && error.status === HTTP_UNAUTHORIZED) {
    clearCachedToken();
  }
  // A 404 usually means the token belongs to a different Google account.
  const isWrongAccountLikely = error instanceof DriveApiError && error.status === HTTP_NOT_FOUND;
  if (isWrongAccountLikely) {
    clearCachedToken();
  }
  const retry = () => runOpenFlow(driveState, isWrongAccountLikely ? 'select_account' : '');
  if (isPopupBlocked(error)) {
    showPanel({
      title: 'Sign-in needed',
      message: 'The browser blocked the Google sign-in popup.',
      actionLabel: 'Continue',
      onAction: retry,
    });
    return;
  }
  showPanel({
    title: 'Could not open file',
    message: describeError(error),
    actionLabel: 'Try again',
    onAction: retry,
  });
}

async function runOpenFlow(driveState, prompt) {
  try {
    await openFile(driveState, prompt);
  } catch (error) {
    handleOpenFailure(error, driveState);
  }
}

async function runInstallFlow() {
  try {
    await getAccessToken({ userId: null, prompt: 'consent' });
    showPanel({
      title: 'Connected to Google Drive',
      message: 'In Drive, right-click an HTML file → Open with → HTML Viewer.',
    });
  } catch (error) {
    console.error(error);
    showPanel({
      title: 'Could not connect',
      message: describeError(error),
      actionLabel: 'Try again',
      onAction: runInstallFlow,
    });
  }
}

function showLanding() {
  showPanel({
    title: 'HTML Viewer for Drive',
    message: 'Render HTML files stored in Google Drive.\nFiles are fetched by your browser and never leave it.',
    actionLabel: 'Connect to Google Drive',
    onAction: runInstallFlow,
  });
}

async function start() {
  if (!isClientIdConfigured()) {
    showPanel({ title: 'Setup required', message: 'Set OAUTH_CLIENT_ID in js/config.js.' });
    return;
  }

  let driveState;
  try {
    driveState = parseDriveState(window.location.search);
    await waitForGoogleIdentityServices();
  } catch (error) {
    console.error(error);
    showPanel({ title: 'Could not start', message: describeError(error) });
    return;
  }

  if (driveState === null || driveState.action !== 'open') {
    showLanding();
    return;
  }
  await runOpenFlow(driveState, '');
}

start();
