import { describe, expect, it } from 'vitest';

import { getColumnValue, inferColumns } from './columns';

describe('nested table columns', () => {
  it('discovers path columns without flattening or overwriting the source row', () => {
    const row = {
      id: 'framework:cloudflare',
      type: 'framework',
      sources: ['spray'],
      model: {
        name: 'cloudflare',
        sources: ['6'],
        raw: { score: 90 },
      },
      extras: { type: 'scanner-context' },
    };

    const columns = inferColumns([row], { includeMeta: true });
    const byKey = new Map(columns.map(column => [column.key, column]));

    expect(byKey.has('model')).toBe(false);
    expect(byKey.has('extras')).toBe(false);
    expect(getColumnValue(row, byKey.get('sources')!)).toEqual(['spray']);
    expect(getColumnValue(row, byKey.get('model.sources')!)).toEqual(['6']);
    expect(getColumnValue(row, byKey.get('model.raw')!)).toEqual({ score: 90 });
    expect(byKey.get('type')?.title).toBe('Type');
    expect(byKey.get('extras.type')?.title).toBe('Extras Type');
    expect(row.model.sources).toEqual(['6']);
  });
});
