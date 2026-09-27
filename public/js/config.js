// OAuth client ID is a public identifier, not a secret.
// Replace with the Web application client ID from Google Cloud Console.
export const OAUTH_CLIENT_ID = 'REPLACE_WITH_CLIENT_ID.apps.googleusercontent.com';

export const OAUTH_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
]);

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export function isClientIdConfigured() {
  return !OAUTH_CLIENT_ID.startsWith('REPLACE_WITH_CLIENT_ID');
}
