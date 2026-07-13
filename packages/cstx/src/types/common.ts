export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

export interface SpanConstraint {
  minCols: number;
  maxCols: number;
  defaultCols: number;
  growable?: boolean;
}

export type Tone =
  | 'slate'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'cyan'
  | 'teal'
  | 'orange';
