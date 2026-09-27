// Google Drive API v3 calls. All network I/O for Drive lives here.

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const METADATA_FIELDS = 'id,name,mimeType,size,webViewLink';

export class DriveApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
  }
}

export function buildRequestHeaders(accessToken, fileId, resourceKey) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  if (resourceKey) {
    headers['X-Goog-Drive-Resource-Keys'] = `${fileId}/${resourceKey}`;
  }
  return headers;
}

export function buildFileUrl(fileId, params) {
  const query = new URLSearchParams({ supportsAllDrives: 'true', ...params });
  return `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?${query}`;
}

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return body?.error?.message ?? response.statusText;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return response.statusText;
    }
    throw error;
  }
}

async function driveFetch(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new DriveApiError(response.status, await readErrorMessage(response));
  }
  return response;
}

export async function fetchFileMetadata({ fileId, accessToken, resourceKey }) {
  const url = buildFileUrl(fileId, { fields: METADATA_FIELDS });
  const response = await driveFetch(url, buildRequestHeaders(accessToken, fileId, resourceKey));
  return response.json();
}

export async function fetchFileBytes({ fileId, accessToken, resourceKey }) {
  const url = buildFileUrl(fileId, { alt: 'media' });
  const response = await driveFetch(url, buildRequestHeaders(accessToken, fileId, resourceKey));
  return response.arrayBuffer();
}
