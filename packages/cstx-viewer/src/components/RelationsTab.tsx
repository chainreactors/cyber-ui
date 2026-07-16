import { useMemo, useState, useCallback } from 'react';
import { CSTXTable } from '@cyber/cstx';
import type { CstxEdge } from '@cyber/cstx';

const EXCLUDE_COLUMNS = ['_raw', 'id', 'embedding', 'vector', 'semantic'];

function flattenEdge(edge: CstxEdge): Record<string, unknown> {
  const attrFields = edge.attrs ? { ...edge.attrs } : {};
  delete (attrFields as Record<string, unknown>)._cstx_diff;
  return {
    ...attrFields,
    id: edge.id,
    source: edge.source_id,
    target: edge.target_id,
    relation_type: edge.relation_type,
    sources: (edge.sources ?? []).join(', '),
    _raw: edge,
  };
}

interface RelationsTabProps {
  edges: CstxEdge[];
}

export function RelationsTab({ edges }: RelationsTabProps) {
  const [activeType, setActiveType] = useState<string | null>(null);

  const typeGroups = useMemo(() => {
    const groups: Record<string, CstxEdge[]> = {};
    for (const edge of edges) {
      const t = edge.relation_type;
      (groups[t] ??= []).push(edge);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [edges]);

  const currentType = activeType && typeGroups.some(([t]) => t === activeType)
    ? activeType
    : null;

  const filteredEdges = useMemo(() => {
    if (!currentType) return edges;
    return typeGroups.find(([t]) => t === currentType)?.[1] ?? edges;
  }, [currentType, typeGroups, edges]);

  const rows = useMemo(() => filteredEdges.map(flattenEdge), [filteredEdges]);

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
            All <span className="ml-0.5 tabular-nums opacity-60">{edges.length}</span>
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
            compact: true,
            pageSize: 50,
            columnsExclude: EXCLUDE_COLUMNS,
            paginationMode: 'client',
          }}
          onAction={handleAction}
        />
      </div>
    </div>
  );
}
