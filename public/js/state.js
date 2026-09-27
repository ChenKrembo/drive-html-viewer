// Parses the `state` query parameter Google Drive appends to the Open URL.
// https://developers.google.com/workspace/drive/api/guides/integrate-open

export class DriveStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DriveStateError';
  }
}

const FILE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function isValidFileId(value) {
  return typeof value === 'string' && FILE_ID_PATTERN.test(value);
}

function pickResourceKeys(rawResourceKeys, fileIds) {
  if (rawResourceKeys === null || typeof rawResourceKeys !== 'object') {
    return {};
  }
  const entries = fileIds
    .filter((fileId) => typeof rawResourceKeys[fileId] === 'string')
    .map((fileId) => [fileId, rawResourceKeys[fileId]]);
  return Object.fromEntries(entries);
}

/**
 * @param {string} search - location.search, e.g. "?state=%7B...%7D"
 * @returns {null | Readonly<{action: string, fileIds: readonly string[], userId: string | null, resourceKeys: Readonly<Record<string, string>>}>}
 *   null when no state parameter is present (direct visit to the app).
 */
export function parseDriveState(search) {
  const rawState = new URLSearchParams(search).get('state');
  if (rawState === null) {
    return null;
  }

  let decoded;
  try {
    decoded = JSON.parse(rawState);
  } catch (error) {
    throw new DriveStateError(`state parameter is not valid JSON: ${error.message}`);
  }
  if (decoded === null || typeof decoded !== 'object') {
    throw new DriveStateError('state parameter is not a JSON object');
  }

  const fileIds = Array.isArray(decoded.ids) ? decoded.ids.filter(isValidFileId) : [];
  if (decoded.action === 'open' && fileIds.length === 0) {
    throw new DriveStateError('state parameter contains no valid file IDs');
  }

  return Object.freeze({
    action: String(decoded.action ?? ''),
    fileIds: Object.freeze(fileIds),
    userId: typeof decoded.userId === 'string' ? decoded.userId : null,
    resourceKeys: Object.freeze(pickResourceKeys(decoded.resourceKeys, fileIds)),
  });
}
