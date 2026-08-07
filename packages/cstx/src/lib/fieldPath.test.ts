import { describe, expect, it } from 'vitest';

import { getCSTXDiffChangeKind, getFieldValue } from './fieldPath';

describe('original record field paths', () => {
  it('keeps identically named fields in separate containers', () => {
    const row = {
      sources: ['gogo'],
      model: { sources: ['4'], type: 'framework' },
      extras: { type: 'scanner-context' },
    };

    expect(getFieldValue(row, 'sources')).toEqual(['gogo']);
    expect(getFieldValue(row, 'model.sources')).toEqual(['4']);
    expect(getFieldValue(row, 'model.type')).toBe('framework');
    expect(getFieldValue(row, 'extras.type')).toBe('scanner-context');
  });

  it('reads node and edge diff markers without modifying the record', () => {
    const node = { extras: { _cstx_diff: { change_kind: 'updated' } } };
    const edge = { attrs: { _cstx_diff: { change_kind: 'added' } } };

    expect(getCSTXDiffChangeKind(node)).toBe('updated');
    expect(getCSTXDiffChangeKind(edge)).toBe('added');
    expect(node).toEqual({ extras: { _cstx_diff: { change_kind: 'updated' } } });
    expect(edge).toEqual({ attrs: { _cstx_diff: { change_kind: 'added' } } });
  });
});
