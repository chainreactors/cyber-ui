import { describe, expect, it } from 'vitest';
import { sparseColumnKeys, type ColumnConfig } from './columns';

describe('sparseColumnKeys', () => {
  it('keeps explicitly protected identity columns visible', () => {
    const rows = [
      { id: '1', name: 'alpha', port: 443 },
      { id: '2' },
      { id: '3' },
    ];
    const columns: ColumnConfig[] = [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Name' },
      { key: 'port', title: 'Port' },
    ];

    const sparse = sparseColumnKeys(rows, columns, 0.5, {
      alwaysVisible: new Set(['name']),
    });

    expect(sparse.has('name')).toBe(false);
    expect(sparse.has('port')).toBe(true);
  });
});
