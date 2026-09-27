// OAuth client ID is a public identifier, not a secret.
// Web application client from Cloud project drive-html-viewer-509916.
export const OAUTH_CLIENT_ID = '416174678671-mnjuil852mrlng4g7vlcs4ekjbv77ill.apps.googleusercontent.com';

export const OAUTH_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
]);

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export function isClientIdConfigured() {
  return !OAUTH_CLIENT_ID.startsWith('REPLACE_WITH_CLIENT_ID');
}
