// Decodes raw HTML bytes to a string, honouring BOM and <meta charset>.
// The rendered frame receives a string, so the browser's own charset
// sniffing never runs; this module replaces it.

const PRESCAN_BYTE_COUNT = 1024;
const DEFAULT_ENCODING = 'utf-8';

const META_CHARSET_PATTERN = /<meta[^>]+charset\s*=\s*["']?\s*([A-Za-z0-9_:.-]+)/i;

function detectBomEncoding(bytes) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8';
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return 'utf-16be';
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return 'utf-16le';
  }
  return null;
}

function detectMetaEncoding(bytes) {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, PRESCAN_BYTE_COUNT));
  const match = META_CHARSET_PATTERN.exec(head);
  return match === null ? null : match[1].toLowerCase();
}

function isSupportedEncoding(label) {
  try {
    new TextDecoder(label);
    return true;
  } catch (error) {
    if (error instanceof RangeError) {
      return false;
    }
    throw error;
  }
}

/** @param {Uint8Array} bytes */
export function detectEncoding(bytes) {
  const candidate = detectBomEncoding(bytes) ?? detectMetaEncoding(bytes);
  if (candidate === null || !isSupportedEncoding(candidate)) {
    return DEFAULT_ENCODING;
  }
  return candidate;
}

/** @param {ArrayBuffer} buffer */
export function decodeHtml(buffer) {
  const bytes = new Uint8Array(buffer);
  return new TextDecoder(detectEncoding(bytes)).decode(bytes);
}
