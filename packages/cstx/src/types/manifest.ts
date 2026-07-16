import type { SpanConstraint, JsonValue } from './common';

export interface DataSlot {
  key: string;
  label: string;
  shape: 'array' | 'object' | 'scalar';
  required?: boolean;
  description?: string;
  typeHint?: string;
  example?: JsonValue;
}

export interface PropSlot<T = JsonValue> {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object';
  default?: T;
  options?: T[];
  required?: boolean;
  description?: string;
}

export interface ComponentManifest {
  type: string;
  displayName: string;
  description: string;
  span: SpanConstraint;
  dataSlots: DataSlot[];
  propSlots: PropSlot[];
  tags?: string[];
}
