import type { JsonObject } from '../../types/common';

export interface ColumnConfig {
  key: string;
  title?: string;
  sortable?: boolean;
  width?: string;
  render?: string;
  renderOptions?: JsonObject;
  filterable?: boolean;
  searchable?: boolean;
  align?: 'left' | 'center' | 'right';
  hidden?: boolean;
}

export function humanize(key: string): string {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferRenderType(key: string, values: unknown[]): string | undefined {
  if (values.length === 0) return undefined;

  const normalizedKey = key.toLowerCase();
  if (normalizedKey === 'sources' || normalizedKey.endsWith('_sources')) {
    return 'tags';
  }
  if (normalizedKey === 'type' || normalizedKey.endsWith('_type')) {
    return 'badge';
  }
  if (
    normalizedKey.includes('time') ||
    normalizedKey.includes('date') ||
    normalizedKey.endsWith('_at')
  ) {
    return 'timestamp';
  }

  if (values.every((v) => typeof v === 'boolean')) return 'boolean';
  if (values.every((v) => typeof v === 'number')) return 'number';
  if (values.every((v) => Array.isArray(v))) return 'list';

  if (
    values.every(
      (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
    )
  )
    return 'json';

  const strings = values.filter((v) => typeof v === 'string') as string[];
  if (strings.length === 0) return undefined;

  if (
    strings.every(
      (s) => /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{10,13}$/.test(s),
    )
  )
    return 'timestamp';
  if (strings.every((s) => /^https?:\/\//.test(s))) return 'link';

  return undefined;
}

function isLowCardinality(values: unknown[], totalRows: number): boolean {
  const unique = new Set(values.map(String));
  return unique.size > 1 && unique.size <= Math.min(20, totalRows * 0.3);
}

const EXCLUDED_KEYS = new Set([
  '__typename',
  '_id',
  '_rev',
  '_key',
  'attributes',
  'extras',
  'task_ids',
  'flow_ids',
  'project_id',
  'cstx_id',
  'cstx_flags',
  'id',
]);

const PREFERRED_FRONT_KEY_ORDER = [
  'name',
  'title',
  'type',
  'severity',
  'status',
  'sources',
  'host',
  'ip',
  'domain',
  'url',
  'port',
  'app_id',
  'scheme',
  'protocol',
  'service',
  'value',
];

const TIME_KEY_ORDER = [
  'created_time',
  'updated_time',
  'created_at',
  'updated_at',
  'first_seen',
  'last_seen',
];

const PREFERRED_FRONT_KEY_INDEX = new Map(
  PREFERRED_FRONT_KEY_ORDER.map((key, index) => [key, index]),
);

const TIME_KEY_INDEX = new Map(
  TIME_KEY_ORDER.map((key, index) => [key, index]),
);

function isTimeKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  return (
    TIME_KEY_INDEX.has(normalizedKey) ||
    normalizedKey.includes('time') ||
    normalizedKey.includes('date') ||
    normalizedKey.endsWith('_at')
  );
}

function comparable(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(String).join(',');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function hasValues(rows: Record<string, unknown>[], key: string): boolean {
  return rows.some((row) => row[key] != null && comparable(row[key]) !== '');
}

function isDuplicateOf(
  rows: Record<string, unknown>[],
  key: string,
  otherKey: string,
): boolean {
  const withValue = rows.filter(
    (row) => row[key] != null && comparable(row[key]) !== '',
  );
  return (
    withValue.length > 0 &&
    withValue.every(
      (row) =>
        row[otherKey] != null &&
        comparable(row[key]) === comparable(row[otherKey]),
    )
  );
}

function shouldExcludeKey(
  key: string,
  rows: Record<string, unknown>[],
  includeMeta = false,
): boolean {
  if (!includeMeta && EXCLUDED_KEYS.has(key)) return true;
  if (!hasValues(rows, key)) return true;

  if (key === 'value' && !includeMeta && isDuplicateOf(rows, key, 'name')) {
    return true;
  }

  return false;
}

function inferColumnWidth(key: string, values: unknown[]): string {
  const normalizedKey = key.toLowerCase();

  if (
    normalizedKey === 'app_id' ||
    normalizedKey === 'appid' ||
    normalizedKey === 'application_id'
  ) {
    return '260px';
  }
  if (
    normalizedKey === 'name' ||
    normalizedKey === 'title' ||
    normalizedKey === 'value' ||
    normalizedKey === 'url'
  ) {
    // Flexible primary column: keeps a 260px floor but absorbs horizontal slack
    // so a table with few columns fills its container instead of leaving a dead
    // gap on the right. No space after the comma — useColumnResize splits the
    // grid template on whitespace. estimateColumnWidth reads the 260px floor.
    return 'minmax(260px,1fr)';
  }
  if (normalizedKey === 'sources' || normalizedKey.endsWith('_sources')) {
    return '180px';
  }
  // Host / domain columns hold variable-length text, so let them share the
  // horizontal slack with the primary column (rather than pinning a long
  // hostname to a fixed 160px and pushing the dead space to the table edge).
  if (
    normalizedKey === 'host' ||
    normalizedKey === 'hostname' ||
    normalizedKey === 'domain' ||
    normalizedKey === 'fqdn'
  ) {
    return 'minmax(160px,1fr)';
  }
  if (normalizedKey === 'port' || normalizedKey.endsWith('_port')) {
    return '96px';
  }
  if (
    normalizedKey === 'scheme' ||
    normalizedKey === 'protocol' ||
    normalizedKey.endsWith('_protocol')
  ) {
    return '96px';
  }
  if (normalizedKey === 'type' || normalizedKey.endsWith('_type')) {
    return '120px';
  }
  if (
    normalizedKey.includes('time') ||
    normalizedKey.includes('date') ||
    normalizedKey.endsWith('_at')
  ) {
    return '180px';
  }
  if (values.every((v) => typeof v === 'number')) return '120px';
  if (values.every((v) => typeof v === 'boolean')) return '96px';
  if (values.some((v) => Array.isArray(v) || typeof v === 'object')) {
    return '180px';
  }

  return '160px';
}

function sortByPriority(keys: string[]): string[] {
  return keys.sort((a, b) => {
    const aKey = a.toLowerCase();
    const bKey = b.toLowerCase();
    const aPriority = PREFERRED_FRONT_KEY_INDEX.get(aKey);
    const bPriority = PREFERRED_FRONT_KEY_INDEX.get(bKey);
    if (aPriority != null || bPriority != null) {
      return (aPriority ?? Number.MAX_SAFE_INTEGER) -
        (bPriority ?? Number.MAX_SAFE_INTEGER);
    }
    const aIsTime = isTimeKey(a);
    const bIsTime = isTimeKey(b);
    if (aIsTime !== bIsTime) return aIsTime ? 1 : -1;
    if (aIsTime && bIsTime) {
      const aTimePriority = TIME_KEY_INDEX.get(aKey);
      const bTimePriority = TIME_KEY_INDEX.get(bKey);
      return (aTimePriority ?? Number.MAX_SAFE_INTEGER) -
        (bTimePriority ?? Number.MAX_SAFE_INTEGER);
    }
    return 0;
  });
}

export function inferColumns(
  rows: Record<string, unknown>[],
  options?: { includeMeta?: boolean },
): ColumnConfig[] {
  if (rows.length === 0) return [];

  const includeMeta = options?.includeMeta ?? false;
  const sample = rows.slice(0, 20);
  const keyOrder: string[] = [];
  const keySeen = new Set<string>();

  for (const row of sample) {
    for (const k of Object.keys(row)) {
      if (!keySeen.has(k) && !shouldExcludeKey(k, sample, includeMeta)) {
        keySeen.add(k);
        keyOrder.push(k);
      }
    }
  }

  return sortByPriority(keyOrder).map((key) => {
    const values = sample.map((r) => r[key]).filter((v) => v != null);
    const render = inferRenderType(key, values);
    return {
      key,
      title: humanize(key),
      sortable: true,
      render,
      width: inferColumnWidth(key, values),
      filterable: isLowCardinality(values, rows.length),
      searchable: values.some((v) => typeof v === 'string'),
    };
  });
}

export function isMetaKey(key: string): boolean {
  if (EXCLUDED_KEYS.has(key)) return true;
  if (key.startsWith('cstx_') || key.startsWith('__')) return true;
  const derived = key.match(/^(.+?)_(count|keys|first)$/);
  if (derived && EXCLUDED_KEYS.has(derived[1])) return true;
  return false;
}

export function applyExclusions(
  columns: ColumnConfig[],
  exclude?: string[],
): ColumnConfig[] {
  if (!exclude || exclude.length === 0) return columns;
  const set = new Set(exclude);
  return columns.filter((c) => !set.has(c.key));
}

export function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      flat[key] = JSON.stringify(obj);
      const keys = Object.keys(obj);
      flat[`${key}_count`] = keys.length;
      if (keys.length > 0) {
        flat[`${key}_keys`] = keys.join(', ');
      }
    } else if (Array.isArray(value)) {
      flat[key] = value.map(String).join(', ');
      flat[`${key}_count`] = value.length;
      if (value.length > 0) {
        flat[`${key}_first`] = value[0];
      }
    } else {
      flat[key] = value;
    }
  }
  return flat;
}
