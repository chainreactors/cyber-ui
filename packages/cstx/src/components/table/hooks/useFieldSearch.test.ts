import { describe, expect, it } from 'vitest';

import { matchesFieldSearch, parseSearchQuery } from './useFieldSearch';

describe('nested table field search', () => {
  it('reads ownership-qualified fields from the original row', () => {
    const row = {
      type: 'app',
      model: { type: 'framework' },
      extras: { status: 'observed' },
    };
    const columns = ['type', 'model.type', 'extras.status'];

    expect(matchesFieldSearch(row, parseSearchQuery('model.type:framework'), columns)).toBe(true);
    expect(matchesFieldSearch(row, parseSearchQuery('extras.status~serve'), columns)).toBe(true);
    expect(matchesFieldSearch(row, parseSearchQuery('model.type:app'), columns)).toBe(false);
  });
});
