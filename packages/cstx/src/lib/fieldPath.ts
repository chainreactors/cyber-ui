export type FieldPath = string | readonly string[];

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function fieldPathSegments(path: FieldPath): string[] {
  return typeof path === 'string' ? path.split('.').filter(Boolean) : [...path];
}

export function fieldPathKey(path: FieldPath): string {
  return fieldPathSegments(path).join('.');
}

/** Read a value from the original record without materializing a flattened copy. */
export function getFieldValue(record: unknown, path: FieldPath): unknown {
  if (!isRecord(record)) return undefined;

  if (typeof path === 'string' && Object.prototype.hasOwnProperty.call(record, path)) {
    return record[path];
  }

  let current: unknown = record;
  for (const segment of fieldPathSegments(path)) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

export function getCSTXDiffChangeKind(value: unknown): string {
  for (const path of [
    ['extras', '_cstx_diff', 'change_kind'],
    ['attrs', '_cstx_diff', 'change_kind'],
  ] as const) {
    const changeKind = getFieldValue(value, path);
    if (typeof changeKind === 'string') return changeKind;
  }
  return '';
}
