import React, { useState, useCallback, useMemo } from 'react';
import type { CellConfig } from '../types/perspective';
import type { JsonObject } from '../types/common';
import { useCstxUi } from './CstxUiProvider';
import type { RuntimeComponentProps } from './registry';

interface DataResolverProps {
  cell: CellConfig;
  colSpan: number;
  variables?: Record<string, unknown>;
  onAction?: (cellId: string, action: string, payload?: Record<string, unknown>) => void;
}

function interpolateParams(
  params: JsonObject | undefined,
  variables: Record<string, unknown> | undefined,
): JsonObject | undefined {
  if (!params || !variables) return params;
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(params)) {
    if (
      typeof value === 'string' &&
      value.startsWith('${') &&
      value.endsWith('}')
    ) {
      const varName = value.slice(2, -1);
      result[key] = (variables[varName] as JsonObject[string]) ?? value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

function readField(value: unknown, path: string): unknown {
  if (!path) return undefined;
  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

export function DataResolver({
  cell,
  colSpan,
  variables,
  onAction,
}: DataResolverProps): React.JSX.Element {
  const { registry, useDataQuery } = useCstxUi();

  const baseParams = cell.bind
    ? interpolateParams(cell.bind.params, variables)
    : undefined;

  const [dynamicParams, setDynamicParams] = useState<Record<string, unknown>>({});

  const mergedParams = useMemo(() => {
    const hasOverrides = Object.keys(dynamicParams).length > 0;
    if (!baseParams && !hasOverrides) return undefined;
    if (!hasOverrides) return baseParams;
    return { ...(baseParams || {}), ...dynamicParams } as JsonObject;
  }, [baseParams, dynamicParams]);

  const queryResult = useDataQuery(
    cell.bind?.queryKey ?? '__noop__',
    mergedParams,
  );

  const entry = registry.get(cell.component);
  if (!entry) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        Unknown component: <code>{cell.component}</code>
      </div>
    );
  }

  const { component: Component, manifest } = entry;

  const dataRecord: Record<string, unknown> = {};
  const loadingRecord: Record<string, boolean> = {};
  const errorRecord: Record<string, Error | null> = {};

  if (cell.data) {
    for (const slot of manifest.dataSlots) {
      dataRecord[slot.key] = cell.data[slot.key] ?? null;
      loadingRecord[slot.key] = false;
      errorRecord[slot.key] = null;
    }
  } else if (cell.bind) {
    const fieldMap = cell.bind.fieldMap;
    for (const slot of manifest.dataSlots) {
      const hasMappedField = Boolean(
        fieldMap && Object.prototype.hasOwnProperty.call(fieldMap, slot.key),
      );
      const sourceField = hasMappedField ? fieldMap?.[slot.key] : slot.key;
      const raw = queryResult.data;
      const mappedValue = sourceField ? readField(raw, sourceField) : undefined;
      dataRecord[slot.key] = mappedValue !== undefined
        ? mappedValue
        : hasMappedField
          ? null
          : raw ?? null;
      loadingRecord[slot.key] = queryResult.isLoading;
      errorRecord[slot.key] = queryResult.error;
    }
  } else {
    for (const slot of manifest.dataSlots) {
      dataRecord[slot.key] = null;
      loadingRecord[slot.key] = false;
      errorRecord[slot.key] = null;
    }
  }

  const configRecord: Record<string, unknown> = {};
  for (const propSlot of manifest.propSlots) {
    configRecord[propSlot.key] =
      (cell.props?.[propSlot.key] as unknown) ?? propSlot.default;
  }

  const handleAction = onAction
    ? (action: string, payload?: Record<string, unknown>) =>
        onAction(cell.id, action, payload)
    : undefined;

  const handleParamsChange = useCallback(
    (params: Record<string, unknown>) => {
      setDynamicParams((prev) => ({ ...prev, ...params }));
    },
    [],
  );

  const runtimeProps: RuntimeComponentProps = {
    data: dataRecord,
    loading: loadingRecord,
    errors: errorRecord,
    config: configRecord,
    colSpan,
    onAction: handleAction,
    onParamsChange: cell.bind ? handleParamsChange : undefined,
  };

  return <Component {...runtimeProps} />;
}
