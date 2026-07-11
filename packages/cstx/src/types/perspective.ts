import type { JsonObject, JsonValue } from './common';

export interface BindQuery {
  queryKey: string;
  params?: JsonObject;
  fieldMap?: Record<string, string>;
}

export interface CellConfig {
  id: string;
  component: string;
  colSpan?: number;
  props?: JsonObject;
  bind?: BindQuery;
  data?: JsonObject;
}

export interface LayoutSection {
  id?: string;
  title?: string;
  cells: CellConfig[];
  gap?: 'sm' | 'md' | 'lg';
}

export interface PerspectiveConfig {
  version: 1;
  id: string;
  title: string;
  description?: string;
  sections: LayoutSection[];
  variables?: Record<string, JsonValue>;
}
