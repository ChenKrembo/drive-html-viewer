import { describe, expect, test } from 'bun:test';
import { decodeHtml, detectEncoding } from '../public/js/charset.js';

function latin1Bytes(text) {
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

describe('detectEncoding', () => {
  test('defaults to utf-8', () => {
    expect(detectEncoding(latin1Bytes('<html></html>'))).toBe('utf-8');
  });

  test('prefers the BOM over meta', () => {
    const bytes = new Uint8Array([0xff, 0xfe, ...latin1Bytes('<meta charset="windows-1255">')]);
    expect(detectEncoding(bytes)).toBe('utf-16le');
  });

  test('reads meta charset', () => {
    expect(detectEncoding(latin1Bytes('<meta charset="windows-1255">'))).toBe('windows-1255');
  });

  test('reads http-equiv content-type charset', () => {
    const html = '<meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-8">';
    expect(detectEncoding(latin1Bytes(html))).toBe('iso-8859-8');
  });

  test('falls back to utf-8 for unknown labels', () => {
    expect(detectEncoding(latin1Bytes('<meta charset="not-a-charset">'))).toBe('utf-8');
  });
});

describe('decodeHtml', () => {
  test('decodes utf-8', () => {
    const buffer = new TextEncoder().encode('<p>שלום</p>').buffer;
    expect(decodeHtml(buffer)).toBe('<p>שלום</p>');
  });

  test('decodes windows-1255 declared in meta', () => {
    const bytes = new Uint8Array([...latin1Bytes('<meta charset="windows-1255">'), 0xf9]);
    expect(decodeHtml(bytes.buffer).endsWith('ש')).toBe(true);
  });
});
