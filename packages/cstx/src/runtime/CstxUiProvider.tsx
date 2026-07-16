import React, { createContext, useContext, useMemo } from 'react';
import { ComponentRegistry, defaultRegistry } from './registry';
import type { UseDataQuery } from '../types/data';

interface CstxUiContextValue {
  registry: ComponentRegistry;
  useDataQuery: UseDataQuery;
}

const CstxUiContext = createContext<CstxUiContextValue | null>(null);

export function useCstxUi(): CstxUiContextValue {
  const ctx = useContext(CstxUiContext);
  if (!ctx) {
    throw new Error('useCstxUi must be used within a <CstxUiProvider>');
  }
  return ctx;
}

export interface CstxUiProviderProps {
  children: React.ReactNode;
  registry?: ComponentRegistry;
  useDataQuery: UseDataQuery;
}

export function CstxUiProvider({
  children,
  registry = defaultRegistry,
  useDataQuery,
}: CstxUiProviderProps): React.JSX.Element {
  const value = useMemo(
    () => ({ registry, useDataQuery }),
    [registry, useDataQuery],
  );
  return (
    <CstxUiContext.Provider value={value}>{children}</CstxUiContext.Provider>
  );
}
