// Google Identity Services token-model wrapper.
// https://developers.google.com/identity/oauth2/web/guides/use-token-model

import { OAUTH_CLIENT_ID, OAUTH_SCOPES } from './config.js';

const TOKEN_STORAGE_KEY = 'drive-html-viewer.token';
const EXPIRY_SAFETY_MARGIN_MS = 60 * 1000;

export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export function isPopupBlocked(error) {
  return error instanceof AuthError && error.code === 'popup_failed_to_open';
}

function readCachedToken(userId) {
  const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const cached = JSON.parse(raw);
    const isFresh = cached.expiresAt - EXPIRY_SAFETY_MARGIN_MS > Date.now();
    const isSameUser = userId === null || cached.userId === userId;
    return isFresh && isSameUser ? cached.accessToken : null;
  } catch (error) {
    if (error instanceof SyntaxError) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    throw error;
  }
}

function cacheToken(userId, tokenResponse) {
  const expiresAt = Date.now() + Number(tokenResponse.expires_in) * 1000;
  const entry = { userId, accessToken: tokenResponse.access_token, expiresAt };
  sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(entry));
}

function requestTokenFromGoogle({ userId, prompt }) {
  if (typeof google === 'undefined' || !google.accounts?.oauth2) {
    return Promise.reject(new AuthError('gis_not_loaded', 'Google Identity Services failed to load'));
  }
  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: OAUTH_CLIENT_ID,
      scope: OAUTH_SCOPES.join(' '),
      login_hint: userId ?? undefined,
      prompt,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          reject(new AuthError(tokenResponse.error, tokenResponse.error_description ?? tokenResponse.error));
          return;
        }
        // Granular consent lets the user untick individual scopes.
        if (!google.accounts.oauth2.hasGrantedAllScopes(tokenResponse, ...OAUTH_SCOPES)) {
          reject(new AuthError('scopes_not_granted', 'Both Google Drive permissions must be granted.'));
          return;
        }
        resolve(tokenResponse);
      },
      error_callback: (error) => reject(new AuthError(error.type, error.message)),
    });
    tokenClient.requestAccessToken();
  });
}

/**
 * @param {{userId: string | null, prompt?: '' | 'consent' | 'select_account'}} options
 * @returns {Promise<string>} access token
 */
export async function getAccessToken({ userId, prompt = '' }) {
  const cachedToken = readCachedToken(userId);
  if (cachedToken !== null) {
    return cachedToken;
  }
  const tokenResponse = await requestTokenFromGoogle({ userId, prompt });
  cacheToken(userId, tokenResponse);
  return tokenResponse.access_token;
}

export function clearCachedToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}
