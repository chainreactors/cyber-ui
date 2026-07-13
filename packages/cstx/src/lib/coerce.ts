/**
 * Safe type coercion primitives for raw/unknown CSTX data.
 *
 * Every function takes `unknown` and returns a well-typed value or a
 * sensible default — no exceptions thrown, no runtime surprises.
 */

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter((item): item is string => Boolean(item));
  }
  const single = asString(value);
  return single ? [single] : [];
}

export function asIsoTime(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 0) return undefined;
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.getTime() > 0 ? date.toISOString() : undefined;
  }
  return undefined;
}

export function asCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return 0;
}

export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function ensureNumber(value: unknown, fallback: number = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function stripTypePrefix(
  value: string | undefined,
  nodeType: string | undefined,
): string | undefined {
  if (!value || !nodeType) return value;
  const prefix = `${nodeType}:`;
  if (!value.startsWith(prefix)) return value;
  const stripped = value.slice(prefix.length).trim();
  return stripped.length > 0 ? stripped : value;
}

export function normalizeRelationType(rawType: unknown): string | null {
  const normalized = asString(rawType);
  if (!normalized) return null;
  const dotParts = normalized.split('.');
  return dotParts[dotParts.length - 1] || null;
}

/**
 * Normalize an unknown value into a deduplicated string array.
 *
 * Accepts a comma-separated string or an array of strings.  Each element is
 * trimmed; empty strings and duplicates are dropped.
 */
export function normalizeStringArray(value: unknown): string[] {
  const raw = typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of raw) {
    const text = asString(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
}

/**
 * Extract a string field from an unknown record.
 *
 * Returns `''` when the record is not an object, the key is missing, or the
 * value is neither a string nor a number.
 */
export function getRecordStringField(record: unknown, key: string): string {
  const rec = asRecord(record);
  const value = rec[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

export const getDetailPanelDataId = (data: unknown): string =>
  getRecordStringField(data, 'id');

export const getDetailPanelDataName = (data: unknown): string =>
  getRecordStringField(data, 'name');
