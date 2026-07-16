import { useMemo, useState, useCallback } from 'react';
import { CSTXTable } from '@cyber/cstx';
import type { CstxNode } from '@cyber/cstx';

const EXCLUDE_COLUMNS = [
  '_raw', '__type__', '__node_type__', 'cstx_id', 'model',
  'extras', 'sources', 'id', 'embedding', 'vector', 'semantic',
];

function flattenNode(node: CstxNode): Record<string, unknown> {
  const { model, extras, __type__: _t, __node_type__: _nt, ...rest } = node;
  const modelFields = model && typeof model === 'object' ? { ...model } : {};
  delete (modelFields as Record<string, unknown>).__type__;
  delete (modelFields as Record<string, unknown>).__node_type__;
  const extrasFields = extras && typeof extras === 'object' ? { ...extras } : {};
  return {
    ...modelFields,
    ...extrasFields,
    id: node.id,
    type: node.type,
    value: node.value,
    sources: (node.sources ?? []).join(', '),
    _raw: node,
  };
}

interface AssetsTabProps {
  nodes: CstxNode[];
}

export function AssetsTab({ nodes }: AssetsTabProps) {
  const [activeType, setActiveType] = useState<string | null>(null);

  const typeGroups = useMemo(() => {
    const groups: Record<string, CstxNode[]> = {};
    for (const node of nodes) {
      const t = node.type;
      (groups[t] ??= []).push(node);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [nodes]);

  const currentType = activeType && typeGroups.some(([t]) => t === activeType)
    ? activeType
    : null;

  const filteredNodes = useMemo(() => {
    if (!currentType) return nodes;
    return typeGroups.find(([t]) => t === currentType)?.[1] ?? nodes;
  }, [currentType, typeGroups, nodes]);

  const rows = useMemo(() => filteredNodes.map(flattenNode), [filteredNodes]);

  const excludeColumns = useMemo(() => {
    const allKeys = new Set<string>();
    for (const row of rows.slice(0, 20)) {
      for (const key of Object.keys(row)) allKeys.add(key);
    }
    return [...EXCLUDE_COLUMNS, ...Array.from(allKeys).filter(k =>
      k.includes('embedding') || k.includes('vector') || k.includes('semantic'),
    )];
  }, [rows]);

  const handleAction = useCallback((action: string, payload?: Record<string, unknown>) => {
    if (action === 'cellClick' && payload?.value) {
      void navigator.clipboard?.writeText(String(payload.value));
    }
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {typeGroups.length > 1 && (
        <div className="flex items-center gap-0.5 overflow-x-auto px-3 py-1 shrink-0 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveType(null)}
            className={`shrink-0 border-b-2 px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
              !currentType
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500'
            }`}
          >
            All <span className="ml-0.5 tabular-nums opacity-60">{nodes.length}</span>
          </button>
          {typeGroups.map(([type, items]) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={`shrink-0 border-b-2 px-2 py-1.5 text-[11px] font-medium transition-colors ${
                currentType === type
                  ? 'border-slate-400 text-slate-700 dark:border-slate-500 dark:text-slate-300'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500'
              }`}
            >
              {type} <span className="ml-0.5 opacity-60">{items.length}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        <CSTXTable
          key={currentType ?? '__all'}
          data={{ rows, total: rows.length }}
          loading={{ rows: false }}
          errors={{ rows: null }}
          colSpan={4}
          config={{
            enableSearch: true,
            enableSorting: true,
            enablePagination: true,
            enableColumnResize: true,
            enableExport: true,
            exportFormats: ['csv'],
            enableRowSelection: true,
            stickyFirstColumn: true,
            columnSelector: true,
            metaKeys: ['value'],
            compact: true,
            pageSize: 50,
            columnsExclude: excludeColumns,
            paginationMode: 'client',
          }}
          onAction={handleAction}
        />
      </div>
    </div>
  );
}
