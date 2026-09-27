import { describe, expect, test } from 'bun:test';
import { buildFileUrl, buildRequestHeaders } from '../public/js/drive.js';

describe('buildRequestHeaders', () => {
  test('sets the bearer token', () => {
    expect(buildRequestHeaders('token', 'fileA', undefined)).toEqual({
      Authorization: 'Bearer token',
    });
  });

  test('adds the resource key header when present', () => {
    expect(buildRequestHeaders('token', 'fileA', '0-key')).toEqual({
      Authorization: 'Bearer token',
      'X-Goog-Drive-Resource-Keys': 'fileA/0-key',
    });
  });
});

describe('buildFileUrl', () => {
  test('builds a media download URL', () => {
    expect(buildFileUrl('fileA', { alt: 'media' })).toBe(
      'https://www.googleapis.com/drive/v3/files/fileA?supportsAllDrives=true&alt=media',
    );
  });
});
