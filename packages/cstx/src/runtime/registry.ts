import type { ComponentManifest } from '../types/manifest';
import type React from 'react';

export interface RuntimeComponentProps {
  data: Record<string, unknown>;
  loading: Record<string, boolean>;
  errors: Record<string, Error | null>;
  config: Record<string, unknown>;
  colSpan: number;
  onAction?: (action: string, payload?: Record<string, unknown>) => void;
  onParamsChange?: (params: Record<string, unknown>) => void;
}

export type RegisteredComponent = React.ComponentType<RuntimeComponentProps>;

interface RegistryEntry {
  manifest: ComponentManifest;
  component: RegisteredComponent;
}

export class ComponentRegistry {
  private entries = new Map<string, RegistryEntry>();

  register(manifest: ComponentManifest, component: RegisteredComponent): void {
    this.entries.set(manifest.type, { manifest, component });
  }

  get(type: string): RegistryEntry | undefined {
    return this.entries.get(type);
  }

  getManifest(type: string): ComponentManifest | undefined {
    return this.entries.get(type)?.manifest;
  }

  getComponent(type: string): RegisteredComponent | undefined {
    return this.entries.get(type)?.component;
  }

  listManifests(): ComponentManifest[] {
    return Array.from(this.entries.values()).map((e) => e.manifest);
  }

  has(type: string): boolean {
    return this.entries.has(type);
  }
}

export const defaultRegistry = new ComponentRegistry();
