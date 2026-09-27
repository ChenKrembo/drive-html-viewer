import { describe, expect, test } from 'bun:test';
import { DriveStateError, parseDriveState } from '../public/js/state.js';

function toSearch(state) {
  return `?state=${encodeURIComponent(JSON.stringify(state))}`;
}

describe('parseDriveState', () => {
  test('returns null when state is absent', () => {
    expect(parseDriveState('')).toBeNull();
    expect(parseDriveState('?foo=bar')).toBeNull();
  });

  test('parses an open action', () => {
    const state = parseDriveState(
      toSearch({ ids: ['abc_123-XYZ'], action: 'open', userId: '1029', resourceKeys: {} }),
    );
    expect(state.action).toBe('open');
    expect(state.fileIds).toEqual(['abc_123-XYZ']);
    expect(state.userId).toBe('1029');
    expect(state.resourceKeys).toEqual({});
  });

  test('keeps resource keys only for listed file IDs', () => {
    const state = parseDriveState(
      toSearch({
        ids: ['fileA'],
        action: 'open',
        resourceKeys: { fileA: '0-keyA', fileB: '0-keyB' },
      }),
    );
    expect(state.resourceKeys).toEqual({ fileA: '0-keyA' });
  });

  test('drops file IDs with unexpected characters', () => {
    const state = parseDriveState(toSearch({ ids: ['good', '../evil', 42], action: 'open' }));
    expect(state.fileIds).toEqual(['good']);
  });

  test('throws on malformed JSON', () => {
    expect(() => parseDriveState('?state=%7Bnot-json')).toThrow(DriveStateError);
  });

  test('throws on non-object JSON', () => {
    expect(() => parseDriveState('?state=null')).toThrow(DriveStateError);
  });

  test('throws when an open action has no valid IDs', () => {
    expect(() => parseDriveState(toSearch({ ids: [], action: 'open' }))).toThrow(DriveStateError);
  });

  test('returns a frozen result', () => {
    const state = parseDriveState(toSearch({ ids: ['a'], action: 'open' }));
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.fileIds)).toBe(true);
  });
});
