import React, { useMemo, useState, useCallback, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type ExpandedState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight as ChevronRightIcon,
  MoreHorizontal,
  Hash,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RuntimeComponentProps } from '../../runtime/registry';
import { cn } from '../../lib/cn';
import { asRecord, asStringArray } from '../../lib/coerce';
import { downloadText, rowsToCsv } from '../../lib/downloadUtils';
import { defaultCellRenderers, type CellRendererRegistry } from '../../lib/renderers';
import { SearchInput } from '../../lib/SearchInput';
import { useSearchHistory } from '../../lib/useSearchHistory';
import {
  type ColumnConfig,
  humanize,
  inferColumns,
  applyExclusions,
  flattenRow,
  isMetaKey,
} from './columns';
import { TypeFilterBar } from './sub/TypeFilterBar';
import { ColumnSelector } from './sub/ColumnSelector';
import { PaginationBar } from './sub/PaginationBar';
import { SkeletonTable } from './sub/SkeletonTable';
import { EmptyGuide } from './sub/EmptyGuide';
import { ResizeHandle } from './sub/ResizeHandle';
import { DiffBadge, DiffSummaryBar, getDiffRowClass } from './sub/DiffBadge';
import { ExportButton } from './sub/ExportButton';
import { FlagCell, BatchFlagMenu, FLAG_ICON_MAP, FLAG_COLOR_MAP, FLAG_DESCRIPTION_MAP } from './sub/FlagCell';
import { Flag as FlagIcon } from 'lucide-react';
import { CSTX_FLAG_OPTIONS, hasCstxFlag } from '../../lib/cstxFlags';
import { useColumnResize } from './hooks/useColumnResize';
import { parseSearchQuery, matchesFieldSearch } from './hooks/useFieldSearch';
import { useUrlSlot } from './hooks/useUrlState';

type Row = Record<string, unknown>;
type TableActionVariant = 'default' | 'danger' | 'secondary';
interface TableActionConfig {
  id: string;
  label: string;
  icon?: string;
  variant?: TableActionVariant | string;
  disabled?: boolean;
  requiresSelection?: boolean;
  render?: (row: Row, rowId: string) => React.ReactNode;
}

// Minimum reserved width per width-less column. This is only a floor: when the
// container is wider than the column sum, columns are 1fr and expand to fill, so
// lowering it never shrinks a table that already fits — it only lets a many-column
// table (e.g. the 8-column asset list) fit a laptop viewport instead of forcing a
// horizontal scrollbar. 160 was too generous for short cells like port/scheme.
const DEFAULT_COLUMN_WIDTH_PX = 128;
const DEFAULT_COMMON_BADGE_KEYS = ['type'];
const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, 100, 500];

function hasDisplayValue(value: unknown): boolean {
  return value != null && String(value).trim().length > 0;
}

function resolveCommonValue(rows: Row[], key: string): string | null {
  if (rows.length === 0) return null;
  const values = new Set<string>();
  for (const row of rows) {
    const value = row[key];
    if (!hasDisplayValue(value)) return null;
    values.add(String(value));
    if (values.size > 1) return null;
  }
  return Array.from(values)[0] ?? null;
}

function estimateColumnWidth(width: string | undefined): number {
  if (!width) return DEFAULT_COLUMN_WIDTH_PX;
  const minmaxMatch = width.match(/minmax\(\s*(\d+)px/i);
  if (minmaxMatch) return Number(minmaxMatch[1]);
  const pxMatch = width.match(/(\d+)px/i);
  if (pxMatch) return Number(pxMatch[1]);
  const numeric = parseInt(width, 10);
  return Number.isFinite(numeric) ? numeric : DEFAULT_COLUMN_WIDTH_PX;
}

// The width a column may compress to before the table scrolls horizontally — half its
// preferred width, floored at 64px. Columns render at their preferred size (via fr weights)
// when there's room and only shrink toward this floor when the viewport is tight, so a table
// of short cells fits instead of forcing a scrollbar at the summed preferred widths.
function columnFloorWidth(width: string | undefined): number {
  return Math.max(64, Math.round(estimateColumnWidth(width) * 0.5));
}

function resolveIcon(name: string | undefined): LucideIcon | null {
  if (!name) return null;
  return (LucideIcons as Record<string, unknown>)[name] as LucideIcon | undefined ?? null;
}

function actionButtonClass(variant: string | undefined): string {
  if (variant === 'danger') {
    return 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20';
  }
  if (variant === 'secondary') {
    return 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';
  }
  return 'text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30';
}

function resolveRowId(row: Row, rowIdKey: string, index?: number): string {
  const value = row[rowIdKey] ?? row.id ?? row.cstx_id ?? row.name ?? row.value;
  if (value != null && String(value).length > 0) return String(value);
  return index != null ? String(index) : '';
}

function normalizeExportFilename(
  value: unknown,
  context: { rowCount: number; selectedCount: number } = { rowCount: 0, selectedCount: 0 },
): string {
  const base = String(value || 'export').trim() || 'export';
  const resolved = base
    .replace(/\{rows?\}/gi, String(context.rowCount))
    .replace(/\{count\}/gi, String(context.rowCount))
    .replace(/\{selected\}/gi, String(context.selectedCount));
  const sanitized = resolved.replace(/[\\/:*?"<>|]+/g, '-');
  return sanitized.toLowerCase().endsWith('.csv') ? sanitized : `${sanitized}.csv`;
}

function toCsvCellValue(value: unknown): unknown {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return value;
}

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function RowControlHeader({ table }: { table: ReturnType<typeof useReactTable<Row>> }) {
  const selectableRows = table.getFilteredRowModel().rows;
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const allSelected = selectableRows.length > 0 && selectedRows.length === selectableRows.length;
  const someSelected = selectedRows.length > 0 && !allSelected;

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={(el) => {
          if (el) el.indeterminate = someSelected;
        }}
        type="checkbox"
        aria-label="Select all filtered rows"
        checked={allSelected}
        onChange={(e) => {
          const checked = e.target.checked;
          selectableRows.forEach((row) => row.toggleSelected(checked));
        }}
        className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
      />
      <Hash className="h-3 w-3 text-slate-300 dark:text-slate-600" />
    </div>
  );
}

function RowControlCell({ row, table }: {
  row: ReturnType<ReturnType<typeof useReactTable<Row>>['getRowModel']>['rows'][number];
  table: ReturnType<typeof useReactTable<Row>>;
}) {
  const orderedRows = table.getSortedRowModel().rows;
  const orderedIndex = orderedRows.findIndex((candidate) => candidate.id === row.id);
  const displayIndex = orderedIndex >= 0 ? orderedIndex + 1 : row.index + 1;

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select row ${displayIndex}`}
        className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
      />
      <span className="w-8 text-right text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
        {displayIndex.toLocaleString()}
      </span>
    </div>
  );
}

/**
 * Copy `text` to the clipboard, resolving to whether it actually succeeded.
 * The async Clipboard API only exists in a secure context (https / localhost);
 * this table is frequently served over plain http on a bare IP, where
 * `navigator.clipboard` is undefined — so fall back to a hidden-textarea
 * execCommand copy. The textarea is parented inside an open dialog when there
 * is one, so a focus-trapped modal doesn't swallow the selection.
 */
async function writeClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  const secure = typeof window !== 'undefined' && window.isSecureContext;
  if (secure && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to the execCommand path */
    }
  }
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
  const host = (document.activeElement?.closest("[role='dialog']") as HTMLElement | null) ?? document.body;
  host.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  textarea.remove();
  return ok;
}

function CellCopyButton({ value, onCopy }: { value: unknown; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState(false);
  const text = value != null ? String(value) : '';
  if (!text) return null;

  return (
    <button
      type="button"
      className={cn(
        'absolute right-0.5 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-all group-hover:opacity-100 focus-visible:opacity-100',
        copied
          ? 'text-green-500'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300',
      )}
      onClick={async (e) => {
        e.stopPropagation();
        // Own the clipboard write here instead of delegating it to the host's
        // onAction handler — consumers that never wired up 'cellClick' (all of
        // Cairn's tables) previously got a button that flashed a checkmark
        // without copying anything. Still emit the event so hosts can react
        // (e.g. a toast); the copy no longer depends on them doing so.
        const ok = await writeClipboard(text);
        onCopy(text);
        if (!ok) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title={copied ? '已复制' : '复制'}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function CellOpenLinkButton({ href }: { href: string | null }) {
  if (!href) return null;

  return (
    <button
      type="button"
      className="absolute right-5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 focus-visible:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-300"
      onClick={(event) => {
        event.stopPropagation();
        window.open(href, '_blank', 'noopener,noreferrer');
      }}
      title="打开链接"
      aria-label="打开链接"
    >
      <ExternalLink className="h-3 w-3" />
    </button>
  );
}

function RowActionsCell({
  actions,
  row,
  rowId,
  onAction,
}: {
  actions: TableActionConfig[];
  row: Row;
  rowId: string;
  onAction?: (action: string, payload?: Record<string, unknown>) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <div className="flex items-center justify-end gap-0.5">
      {actions.map((action) => {
        if (action.render) {
          return <React.Fragment key={action.id}>{action.render(row, rowId)}</React.Fragment>;
        }
        const Icon = resolveIcon(action.icon);
        return (
          <button
            key={action.id}
            type="button"
            title={action.label}
            aria-label="Row actions"
            disabled={action.disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!action.disabled) {
                onAction?.('rowAction', { action: action.id, rowId, row });
              }
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
          </button>
        );
      })}
    </div>
  );
}

function RowFlagBadges({ row }: { row: Row }) {
  const active = CSTX_FLAG_OPTIONS.filter(opt => hasCstxFlag(row, opt.value));
  if (active.length === 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 mr-1">
      {active.map(f => {
        const Icon = FLAG_ICON_MAP[f.key] ?? FlagIcon;
        return (
          <span key={f.key} title={FLAG_DESCRIPTION_MAP[f.key] ?? f.label}>
            <Icon className="h-3 w-3" style={{ color: FLAG_COLOR_MAP[f.key] }} />
          </span>
        );
      })}
    </span>
  );
}

function buildColumns(
  configs: ColumnConfig[],
  sortingEnabled: boolean,
  renderers: CellRendererRegistry,
  compact: boolean,
  options?: {
    enableExpanding?: boolean;
    enableRowSelection?: boolean;
    stickyFirstColumn?: boolean;
    enableCstxFlags?: boolean;
    diffMode?: boolean;
    diffField?: string;

    rowActions?: TableActionConfig[];
    rowIdKey?: string;
    onAction?: (action: string, payload?: Record<string, unknown>) => void;
  },
): ColumnDef<Row>[] {
  const cols: ColumnDef<Row>[] = [];

  if (options?.enableRowSelection) {
    cols.push({
      id: '__row_control',
      header: ({ table }) => <RowControlHeader table={table} />,
      cell: ({ row, table }) => <RowControlCell row={row} table={table} />,
      size: 72,
      meta: { fixed: true },
    });
  }

  if (options?.diffMode && options.diffField) {
    cols.push({
      id: '__diff',
      accessorKey: options.diffField,
      header: () => <span>Change</span>,
      cell: ({ getValue }) => <DiffBadge changeKind={getValue() as string | undefined} />,
      size: 90,
      meta: { fixed: true },
    });
  }

  if (options?.enableExpanding) {
    cols.push({
      id: '__expand',
      header: () => null,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
          className="rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronRightIcon
            className={cn(
              'h-3.5 w-3.5 text-slate-400 transition-transform',
              row.getIsExpanded() && 'rotate-90',
            )}
          />
        </button>
      ),
      size: 32,
      meta: { fixed: true },
    });
  }

  let isFirstDataCol = true;
  for (const col of configs) {
    if (col.hidden) continue;
    const showFlagBadges = options?.enableCstxFlags && isFirstDataCol;
    isFirstDataCol = false;
    cols.push({
      id: col.key,
      accessorKey: col.key,
      header: ({ column }) => {
        const canSort = sortingEnabled && col.sortable !== false;
        if (!canSort) {
          return (
            <span
              className={cn('block min-w-0 truncate', col.align === 'right' && 'ml-auto')}
              title={col.title ?? col.key}
            >
              {col.title ?? col.key}
            </span>
          );
        }
        const sorted = column.getIsSorted();
        const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
        return (
          <button
            type="button"
            className={cn(
              'flex min-w-0 max-w-full items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100',
              col.align === 'right' && 'ml-auto',
            )}
            onClick={column.getToggleSortingHandler()}
          >
            <span className="min-w-0 truncate" title={col.title ?? col.key}>
              {col.title ?? col.key}
            </span>
            <SortIcon className={cn('shrink-0 opacity-50', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          </button>
        );
      },
      cell: ({ getValue, row: tableRow }) => {
        const v = getValue();
        let content: React.ReactNode;
        const renderName = col.render;
        if (renderName) {
          const renderer = renderers.get(renderName);
          if (renderer) content = renderer(v, tableRow.original, col.renderOptions as Record<string, unknown>);
        }
        if (content === undefined) {
          if (v == null) content = <span className="text-[var(--c-faint,#94a3b8)]">-</span>;
          else if (Array.isArray(v)) {
            const listRenderer = renderers.get('list');
            content = listRenderer ? listRenderer(v, tableRow.original) : String(v);
          }
          else if (typeof v === 'object') {
            const jsonRenderer = renderers.get('json');
            content = jsonRenderer ? jsonRenderer(v, tableRow.original) : JSON.stringify(v);
          }
          else {
            const text = String(v);
            content = (
              <span className="block min-w-0 max-w-full truncate" title={text}>
                {text}
              </span>
            );
          }
        }
        if (!showFlagBadges) return content;
        return (
          <span className="flex min-w-0 max-w-full items-center gap-0">
            <RowFlagBadges row={tableRow.original} />
            <span className="min-w-0 flex-1 overflow-hidden">{content}</span>
          </span>
        );
      },
      size: col.width ? parseInt(String(col.width), 10) || undefined : undefined,
      meta: { align: col.align },
    });
  }

  if (options?.rowActions && options.rowActions.length > 0) {
    cols.push({
      id: '__actions',
      header: () => null,
      cell: ({ row }) => (
        <RowActionsCell
          actions={options.rowActions ?? []}
          row={row.original}
          rowId={row.id}
          onAction={options.onAction}
        />
      ),
      size: Math.max(44, options.rowActions.length * 28 + 8),
      meta: { fixed: true, align: 'right' },
    });
  }

  return cols;
}

export function CSTXTable({
  data,
  loading,
  config,
  onAction,
  onParamsChange,
}: RuntimeComponentProps): React.JSX.Element {
  const rawRows = (data.rows ?? []) as Row[];
  const isLoading = loading.rows;
  const explicitColumns = config.columns as ColumnConfig[] | undefined;
  const columnsExclude = config.columnsExclude as string[] | undefined;
  const initialPageSize = (config.pageSize as number) || 50;
  const enableSearch = config.enableSearch !== false;
  const enablePagination = config.enablePagination !== false;
  const enableSorting = config.enableSorting !== false;
  const enableFlatten = config.flattenRows === true;
  const title = config.title as string;
  const emptyText = (config.emptyText as string) || 'No data';
  const typeFilterKey = config.typeFilterKey as string | undefined;
  const rowIdKey = (config.rowIdKey as string) || 'id';
  const configuredCommonBadgeKeys = asStringArray(config.commonBadgeKeys);
  const commonBadgeLabels = asRecord(config.commonBadgeLabels);
  const compact = config.compact === true;
  const columnSelectorEnabled = config.columnSelector === true;
  const explicitMetaKeys = asStringArray(config.metaKeys);
  const paginationMode = (config.paginationMode as string) || 'client';
  const serverPagination = paginationMode === 'server';
  const serverTotal = serverPagination ? ((data.total as number) || 0) : 0;
  const searchHistoryKey = (config.searchHistoryKey as string) || '';
  const cellRenderers = (config._rendererRegistry as CellRendererRegistry | undefined) ?? defaultCellRenderers;

  const enableRowSelection = config.enableRowSelection === true;
  const enableExpanding = config.enableExpanding === true;
  const enableColumnResize = config.enableColumnResize === true;
  const enableFieldSearch = config.enableFieldSearch === true;
  const enableContextMenu = config.enableContextMenu === true;
  const stickyFirstColumn = config.stickyFirstColumn === true || enableRowSelection;
  const enableColoredTypes = config.enableColoredTypes === true;
  const pageSizeOptions = (config.pageSizeOptions as number[] | undefined) ?? DEFAULT_PAGE_SIZE_OPTIONS;
  const diffMode = config.diffMode === true;
  const diffField = (config.diffField as string) || '_cstx_diff_change_kind';
  const enableExport = config.enableExport === true;
  const exportFormats = (config.exportFormats as string[] | undefined) ?? ['xlsx', 'csv'];
  const exportFilename = config.exportFilename as string | undefined;
  const exportRequiresSelection = config.exportRequiresSelection === true;
  const rowActions = (config.rowActions as TableActionConfig[] | undefined) ?? [];
  const enableCstxFlags = config.enableCstxFlags === true;
  const showRowCount = config.showRowCount !== false;

  // Optional localization. `columnLabels` overrides inferred/explicit header titles by key;
  // `i18n` supplies UI-chrome strings (pagination, selection, empty state). Both are plain
  // string maps supplied by the host app; every string falls back to English when absent, so
  // callers that pass nothing keep the current behaviour.
  const columnLabels = useMemo(() => asRecord(config.columnLabels), [config.columnLabels]);
  const i18n = useMemo(() => asRecord(config.i18n), [config.i18n]);
  const tr = useCallback(
    (key: string, fallback: string) => (typeof i18n[key] === 'string' ? (i18n[key] as string) : fallback),
    [i18n],
  );

  const effectiveRowActions = useMemo(() => {
    if (!enableCstxFlags) return rowActions;
    const flagAction: TableActionConfig = {
      id: '__cstxFlag',
      label: 'Flag',
      render: (row, rowId) => (
        <FlagCell
          row={row}
          onToggle={(flag, active) =>
            onAction?.('cstxFlagToggle', { rowId, row, flag: flag.key, flagValue: flag.value, active })
          }
        />
      ),
    };
    return [flagAction, ...rowActions];
  }, [enableCstxFlags, rowActions, onAction]);

  const urlStateKey = (config.urlStateKey as string) || null;
  const urlPrefix = urlStateKey ? `${urlStateKey}_` : null;

  // --- URL-aware state ---
  const [globalFilter, setGlobalFilter] = useUrlSlot<string>(
    urlPrefix ? `${urlPrefix}q` : null, '', '', 250,
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useUrlSlot<number>(
    urlPrefix ? `${urlPrefix}size` : null, initialPageSize, initialPageSize,
  );

  const searchHistory = useSearchHistory(searchHistoryKey || '__unused__');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const { resizingColumn, handleResizeStart, getAdjustedGridTemplate, resetColumnWidths } = useColumnResize();

  const [serverPage, setServerPage] = useState(0);
  const serverPageCount = serverPagination ? Math.ceil(serverTotal / pageSize) || 1 : 0;

  // --- Data processing ---
  const rows = useMemo(
    () => (enableFlatten ? rawRows.map(flattenRow) : rawRows),
    [rawRows, enableFlatten],
  );

  const commonBadgeKeys = useMemo(() => {
    if (configuredCommonBadgeKeys.length > 0) return Array.from(new Set(configuredCommonBadgeKeys));
    const excludedKeys = new Set(columnsExclude ?? []);
    const keys = [typeFilterKey, ...DEFAULT_COMMON_BADGE_KEYS].filter(
      (key): key is string => typeof key === 'string' && key.length > 0 && !excludedKeys.has(key),
    );
    return Array.from(new Set(keys));
  }, [columnsExclude, configuredCommonBadgeKeys, typeFilterKey]);

  const commonBadges = useMemo(
    () => commonBadgeKeys
      .map((key) => ({ key, label: commonBadgeLabels[key] ?? humanize(key), value: resolveCommonValue(rows, key) }))
      .filter((item): item is { key: string; label: string; value: string } => item.value != null),
    [commonBadgeKeys, commonBadgeLabels, rows],
  );

  const allColumns = useMemo(() => {
    const cols = explicitColumns && explicitColumns.length > 0
      ? explicitColumns
      : inferColumns(rows, { includeMeta: columnSelectorEnabled });
    const afterExclude = columnsExclude ? applyExclusions(cols, columnsExclude) : cols;
    const scoped = applyExclusions(afterExclude, commonBadges.map((b) => b.key));
    return scoped.map((c) => {
      const label = columnLabels[c.key];
      return typeof label === 'string' && label ? { ...c, title: label } : c;
    });
  }, [explicitColumns, rows, columnsExclude, columnSelectorEnabled, commonBadges, columnLabels]);

  const metaKeySet = useMemo(() => {
    const keys = new Set(allColumns.filter((c) => isMetaKey(c.key)).map((c) => c.key));
    explicitMetaKeys.forEach((key) => keys.add(key));
    return keys;
  }, [explicitMetaKeys, allColumns]);

  const [userVisibility, setUserVisibility] = useState<Record<string, boolean>>({});
  const isColumnVisible = useCallback(
    (key: string) => (key in userVisibility ? userVisibility[key] : !metaKeySet.has(key)),
    [userVisibility, metaKeySet],
  );
  const toggleColumnVisibility = useCallback(
    (key: string) => setUserVisibility((prev) => ({ ...prev, [key]: !(prev[key] ?? !metaKeySet.has(key)) })),
    [metaKeySet],
  );

  const resolvedColumns = useMemo(() => {
    if (!columnSelectorEnabled) return allColumns;
    return allColumns.filter((c) => isColumnVisible(c.key));
  }, [allColumns, columnSelectorEnabled, isColumnVisible]);

  // --- Type filter ---
  const typeValues = useMemo(() => {
    if (!typeFilterKey) return [];
    const vals = new Set<string>();
    rows.forEach((r) => { const v = r[typeFilterKey]; if (v != null) vals.add(String(v)); });
    return Array.from(vals).sort();
  }, [rows, typeFilterKey]);

  const typeCounts = useMemo(() => {
    if (!typeFilterKey) return {};
    const counts: Record<string, number> = {};
    rows.forEach((r) => { const v = String(r[typeFilterKey] ?? ''); counts[v] = (counts[v] || 0) + 1; });
    return counts;
  }, [rows, typeFilterKey]);

  const filteredByType = useMemo(() => {
    if (!typeFilterKey || typeFilter.size === 0) return rows;
    return rows.filter((r) => typeFilter.has(String(r[typeFilterKey] ?? '')));
  }, [rows, typeFilterKey, typeFilter]);

  const handleTypeToggle = useCallback((val: string) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (prev.size === 0) {
        typeValues.forEach((v) => { if (v !== val) next.add(v); });
        return next;
      }
      if (next.has(val)) { next.delete(val); if (next.size === 0) return new Set(); }
      else { next.add(val); if (next.size === typeValues.length) return new Set(); }
      return next;
    });
  }, [typeValues]);

  // --- Color map for type badges ---
  const typeColorMap = useMemo(() => {
    if (!enableColoredTypes || typeValues.length === 0) return undefined;
    const hueStep = 360 / Math.max(typeValues.length, 1);
    const map: Record<string, string> = {};
    typeValues.forEach((val, i) => {
      map[val] = `hsl(${Math.round(i * hueStep)}, 55%, 50%)`;
    });
    return map;
  }, [enableColoredTypes, typeValues]);

  // --- Field search ---
  const columnKeys = useMemo(() => resolvedColumns.map((c) => c.key), [resolvedColumns]);
  const customFilterFn = useCallback(
    (row: { original: Row }) => {
      if (!globalFilter) return true;
      if (enableFieldSearch) {
        const parsed = parseSearchQuery(globalFilter);
        return matchesFieldSearch(row.original, parsed, columnKeys);
      }
      const lower = globalFilter.toLowerCase();
      return columnKeys.some((k) => String(row.original[k] ?? '').toLowerCase().includes(lower));
    },
    [globalFilter, enableFieldSearch, columnKeys],
  );

  // --- Build TanStack columns ---
  const columns = useMemo(
    () => buildColumns(resolvedColumns, enableSorting, cellRenderers, compact, {
      enableExpanding,
      enableRowSelection,
      stickyFirstColumn,
      enableCstxFlags,
      diffMode,
      diffField,
      rowActions: effectiveRowActions,
      rowIdKey,
      onAction,
    }),
    [resolvedColumns, enableSorting, cellRenderers, compact, enableExpanding, enableRowSelection, stickyFirstColumn, enableCstxFlags, diffMode, diffField, effectiveRowActions, rowIdKey, onAction],
  );

  const visibleColumns = useMemo(() => resolvedColumns.filter((c) => !c.hidden), [resolvedColumns]);

  // --- Table instance ---
  const table = useReactTable({
    data: filteredByType,
    columns,
    state: { sorting, globalFilter, rowSelection, expanded },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    onExpandedChange: enableExpanding ? setExpanded : undefined,
    globalFilterFn: (row) => customFilterFn(row),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: enablePagination && !serverPagination ? getPaginationRowModel() : undefined,
    getFilteredRowModel: enableSearch ? getFilteredRowModel() : undefined,
    getExpandedRowModel: enableExpanding ? getExpandedRowModel() : undefined,
    enableRowSelection,
    initialState: serverPagination ? {} : { pagination: { pageSize } },
    getRowId: (row, index) => resolveRowId(row, rowIdKey, index),
  });

  // --- Grid template ---
  const actionsColumnWidth = effectiveRowActions.length > 0 ? Math.max(44, effectiveRowActions.length * 28 + 8) : 0;

  const baseGridTemplate = useMemo(() => {
    const parts: string[] = [];
    if (enableRowSelection) parts.push('72px');
    if (diffMode) parts.push('90px');
    if (enableExpanding) parts.push('32px');
    for (const col of visibleColumns) {
      if (!col.width) { parts.push('minmax(0,1fr)'); continue; }
      // Treat the inferred width as a *preferred* size, not a fixed track: an fr weight
      // (∝ preferred px) lets columns fill the container and grow on wide viewports, while a
      // per-column floor lets them compress before a horizontal scrollbar appears. Fixed px
      // tracks summed past the viewport, forcing a scrollbar even when the short cell values
      // would have fit. No spaces inside minmax() — getAdjustedGridTemplate() splits the
      // template on whitespace to remap per-column resize widths.
      parts.push(`minmax(${columnFloorWidth(col.width)}px,${(estimateColumnWidth(col.width) / 100).toFixed(2)}fr)`);
    }
    if (actionsColumnWidth > 0) parts.push(`${actionsColumnWidth}px`);
    return parts.join(' ');
  }, [visibleColumns, enableRowSelection, enableExpanding, diffMode, actionsColumnWidth]);

  const gridColumnIds = useMemo(() => {
    const ids: string[] = [];
    if (enableRowSelection) ids.push('__row_control');
    if (diffMode) ids.push('__diff');
    if (enableExpanding) ids.push('__expand');
    for (const col of visibleColumns) ids.push(col.key);
    if (actionsColumnWidth > 0) ids.push('__actions');
    return ids;
  }, [visibleColumns, enableRowSelection, enableExpanding, diffMode, actionsColumnWidth]);

  const gridTemplateColumns = enableColumnResize
    ? getAdjustedGridTemplate(baseGridTemplate, gridColumnIds)
    : baseGridTemplate;

  const tableMinWidth = visibleColumns.reduce(
    (total, col) => total + columnFloorWidth(col.width), 32,
  ) + (enableRowSelection ? 72 : 0) + (diffMode ? 90 : 0) + (enableExpanding ? 32 : 0) + actionsColumnWidth;

  const tableGridStyle: React.CSSProperties = {
    gridTemplateColumns,
    minWidth: visibleColumns.length > 0 ? `${tableMinWidth}px` : undefined,
  };

  // --- Handlers ---
  const handleRowClick = useCallback((row: Row, resolvedId?: string) => {
    const rowId = resolvedId ?? resolveRowId(row, rowIdKey);
    setActiveRowId((prev) => (prev === rowId ? null : rowId));
    onAction?.('rowClick', { rowId, row: row as Record<string, unknown> });
  }, [onAction, rowIdKey]);

  const handleContextMenu = useCallback((e: React.MouseEvent, row: Row, resolvedId?: string) => {
    if (!enableContextMenu) return;
    e.preventDefault();
    onAction?.('rowRightClick', {
      row: row as Record<string, unknown>,
      rowId: resolvedId ?? resolveRowId(row, rowIdKey),
      position: { x: e.clientX, y: e.clientY },
    });
  }, [enableContextMenu, onAction, rowIdKey]);

  const handleServerPageChange = useCallback((page: number) => {
    setServerPage(page);
    onParamsChange?.({ offset: page * pageSize, limit: pageSize });
  }, [onParamsChange, pageSize]);

  const handleSearchSubmit = useCallback((query: string) => {
    setGlobalFilter(query);
    if (searchHistoryKey && query.trim()) searchHistory.add(query);
  }, [searchHistoryKey, searchHistory, setGlobalFilter]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    table.setPageSize(size);
    if (serverPagination) {
      setServerPage(0);
      onParamsChange?.({ offset: 0, limit: size });
    }
  }, [setPageSize, table, serverPagination, onParamsChange]);

  // --- Selection effects ---
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedOriginalRows = selectedRows.map((row) => row.original);
  const batchActions = config.batchActions as TableActionConfig[] | undefined;
  const showExportButton = enableExport && (!exportRequiresSelection || selectedCount > 0);

  // --- Render ---
  const showHeader = title || commonBadges.length > 0 || columnSelectorEnabled || enableColumnResize || enableExport;

  const handleExport = useCallback((format: 'xlsx' | 'csv' | 'report') => {
    const exportRows = selectedRows.length > 0 ? selectedRows : table.getFilteredRowModel().rows;
    const exportOriginalRows = exportRows.map((row) => row.original);
    const columnDefs = visibleColumns.map((c) => ({ key: c.key, title: c.title ?? c.key }));

    if (format === 'csv') {
      const csvRows = [
        columnDefs.map((column) => column.title),
        ...exportOriginalRows.map((row) =>
          columnDefs.map((column) => toCsvCellValue(row[column.key])),
        ),
      ];
      downloadText(
        normalizeExportFilename(exportFilename ?? title ?? 'export', {
          rowCount: exportOriginalRows.length,
          selectedCount: selectedRows.length,
        }),
        `\uFEFF${rowsToCsv(csvRows)}`,
        'text/csv;charset=utf-8;',
      );
    } else {
      onAction?.('export', {
        format,
        rows: exportOriginalRows,
        columns: columnDefs,
        selectedOnly: selectedRows.length > 0,
      });
    }
  }, [exportFilename, onAction, selectedRows, table, title, visibleColumns]);
  const skeletonColumnCount = visibleColumns.length || 5;

  const hasActiveFilters = typeFilter.size > 0 || !!globalFilter;
  const showFilterChips = typeFilter.size > 0 && typeFilter.size < typeValues.length;
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const hasTypeFilter = typeFilterKey && typeValues.length > 1;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--c-line,#e2e8f0)] bg-[var(--c-surface,#fff)] dark:border-[var(--c-line,#334155)] dark:bg-[var(--c-surface,#0f172a)]">
      {/* ── Unified toolbar: title + search + actions in one row ── */}
      <div className={cn(
        'flex items-center gap-2',
        compact ? 'px-3 py-1.5' : 'px-4 py-2',
      )}>
        {/* Left: title + count */}
        {title && (
          <h3 className={cn('shrink-0 font-medium text-slate-900 dark:text-slate-100', compact ? 'text-xs' : 'text-sm')}>
            {title}
          </h3>
        )}
        {commonBadges.map((badge) => (
          <span
            key={badge.key}
            title={`${badge.label}: ${badge.value}`}
            className="shrink-0 rounded bg-[var(--c-surface-2,#f1f5f9)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--c-muted,#475569)] dark:bg-[var(--c-surface-2,#1e293b)] dark:text-[var(--c-muted,#94a3b8)]"
          >
            {badge.value}
          </span>
        ))}
        {showRowCount && (
          <span className="shrink-0 text-[11px] tabular-nums text-[var(--c-faint,#94a3b8)]">
            {filteredByType.length !== rows.length
              ? `${filteredByType.length} / ${rows.length}`
              : rows.length > 0 ? String(rows.length) : ''}
          </span>
        )}

        {/* Center: inline search */}
        {enableSearch && (
          <div className="mx-2 min-w-0 flex-1">
            <SearchInput
              value={globalFilter}
              onChange={setGlobalFilter}
              onSubmit={handleSearchSubmit}
              placeholder={
                enableFieldSearch
                  ? 'Search... (type:domain value~example)'
                  : `Search${title ? ' ' + title.toLowerCase() : ''}...`
              }
              compact
              className="w-full"
              history={searchHistoryKey ? searchHistory.history : undefined}
              saved={searchHistoryKey ? searchHistory.saved : undefined}
              onSelectHistory={(q) => setGlobalFilter(q)}
              onRemoveHistory={searchHistoryKey ? searchHistory.remove : undefined}
              onClearHistory={searchHistoryKey ? searchHistory.clear : undefined}
              onSave={searchHistoryKey ? searchHistory.save : undefined}
              onUnsave={searchHistoryKey ? searchHistory.unsave : undefined}
              isSaved={searchHistoryKey ? searchHistory.isSaved : undefined}
            />
          </div>
        )}
        {!enableSearch && <div className="flex-1" />}

        {/* Right: action buttons + selection actions */}
        <div className="flex shrink-0 items-center gap-1">
          {enableRowSelection && selectedCount > 0 && (
            <>
              <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--c-accent-fg, #60a5fa)' }}>
                {tr('selected', '{n} selected').replace('{n}', String(selectedCount))}
              </span>
              {enableCstxFlags && (
                <BatchFlagMenu
                  onApply={(flag, mode) => {
                    onAction?.('batchFlagToggle', {
                      flag: flag.key,
                      flagValue: flag.value,
                      mode,
                      selectedRows: selectedOriginalRows,
                    });
                  }}
                />
              )}
              {batchActions?.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    const selectedIds = selectedOriginalRows.map((row, index) => resolveRowId(row, rowIdKey, index));
                    onAction?.('batchAction', {
                      action: action.id,
                      selectedIds,
                      selectedRows: selectedOriginalRows,
                    });
                  }}
                  disabled={action.disabled || (action.requiresSelection !== false && selectedCount === 0)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40',
                    actionButtonClass(action.variant),
                  )}
                >
                  {(() => {
                    const Icon = resolveIcon(action.icon);
                    return Icon ? <Icon className="h-3 w-3" /> : null;
                  })()}
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRowSelection({})}
                className="text-[11px] text-blue-500 hover:text-blue-700 dark:text-blue-400"
              >
                {tr('clear', 'Clear')}
              </button>
              <span className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />
            </>
          )}
          {hasTypeFilter && (
            <button
              type="button"
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                filterPanelOpen || hasActiveFilters
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              {tr('filter', 'Filter')}
              {showFilterChips && (
                <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                  {typeFilter.size}
                </span>
              )}
            </button>
          )}
          {columnSelectorEnabled && (
            <ColumnSelector
              allColumns={allColumns}
              metaKeys={metaKeySet}
              isVisible={isColumnVisible}
              onToggle={toggleColumnVisibility}
              metadataLabel={tr('metadata', 'Metadata')}
              compact
            />
          )}
          {showExportButton && (
            <ExportButton compact onExport={handleExport} formats={exportFormats} />
          )}
        </div>
      </div>

      {/* ── Filter panel (collapsible) ── */}
      {hasTypeFilter && filterPanelOpen && (
        <TypeFilterBar
          allValues={typeValues}
          selected={typeFilter}
          onToggle={handleTypeToggle}
          onClear={() => setTypeFilter(new Set())}
          compact
          colorMap={typeColorMap}
          counts={typeCounts}
        />
      )}

      {/* ── Active filter chips (inline, when panel is closed) ── */}
      {showFilterChips && !filterPanelOpen && (
        <div className={cn(
          'flex flex-wrap items-center gap-1',
          compact ? 'px-3 pb-1.5' : 'px-4 pb-2',
        )}>
          {typeValues
            .filter((v) => typeFilter.has(v))
            .map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleTypeToggle(v)}
                className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
              >
                {v}
                <span className="text-blue-400 dark:text-blue-500">&times;</span>
              </button>
            ))}
          <button
            type="button"
            onClick={() => setTypeFilter(new Set())}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {tr('clearAll', 'Clear all')}
          </button>
        </div>
      )}


      {/* ── Diff summary (compact inline) ── */}
      {diffMode && !isLoading && filteredByType.length > 0 && (
        <DiffSummaryBar rows={filteredByType} diffField={diffField} compact />
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <SkeletonTable
            columns={skeletonColumnCount}
            rows={Math.min(pageSize, 8)}
            compact={compact}
            gridTemplate={gridTemplateColumns}
          />
        ) : filteredByType.length === 0 ? (
          <EmptyGuide
            totalRows={rawRows.length}
            hasSearch={!!globalFilter}
            hasTypeFilter={typeFilter.size > 0}
            emptyText={emptyText}
            compact={compact}
            onClearSearch={() => setGlobalFilter('')}
            onClearTypeFilter={() => setTypeFilter(new Set())}
            labels={{
              noMatch: tr('noMatch', 'No matching results'),
              noMatchHint: tr('noMatchHint', 'Try adjusting your search query or clearing filters.'),
              noTypeMatch: tr('noTypeMatch', 'No items match selected types'),
              noTypeMatchHint: tr('noTypeMatchHint', 'Try selecting different types or clearing the filter.'),
              emptyHint: tr('emptyHint', 'This table has no records to display.'),
              clearSearch: tr('clearSearch', 'Clear search'),
              clearFilters: tr('clearFilters', 'Clear filters'),
            }}
          />
        ) : (
          <>
            {/* Column headers — low-profile, no uppercase, no heavy bg */}
            <div
              className={cn(
                'grid border-b border-[var(--c-line,#e2e8f0)] text-[var(--c-faint,#64748b)] dark:border-[var(--c-line,#334155cc)] dark:text-[var(--c-faint,#64748b)]',
                compact ? 'px-3 text-[11px]' : 'px-4 text-[12px]',
              )}
              style={tableGridStyle}
            >
              {table.getHeaderGroups().map((hg) =>
                hg.headers.map((header, headerIdx) => {
                  const isFirst = headerIdx === 0 && stickyFirstColumn;
                  const isActions = header.column.id === '__actions';
                  const isSticky = isFirst || isActions;
                  return (
                    <div
                      key={header.id}
                      className={cn(
                        'relative min-w-0 font-medium',
                        compact ? 'py-1.5 pr-1.5' : 'py-2 pr-2',
                        isFirst && 'sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]',
                        isActions && 'sticky right-0 z-10 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]',
                      )}
                      style={isSticky ? { background: 'var(--c-surface, var(--color-surface, #fff))' } : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {enableColumnResize && headerIdx < hg.headers.length - 1 && !(header.column.columnDef.meta as Record<string, unknown>)?.fixed && (
                        <ResizeHandle
                          columnId={header.id}
                          isResizing={resizingColumn === header.id}
                          onMouseDown={(e) => handleResizeStart(header.id, e)}
                        />
                      )}
                    </div>
                  );
                }),
              )}
            </div>

            {/* Data rows */}
            {table.getRowModel().rows.map((row) => {
              const isActive = activeRowId === row.id;
              const diffRowClass = diffMode ? getDiffRowClass(row.original[diffField] as string | undefined) : '';
              return (
                <React.Fragment key={row.id}>
                  <div
                    className={cn(
                      'group grid border-b border-[var(--c-line,rgba(241,245,249,0.8))] last:border-b-0 dark:border-[var(--c-line,rgba(30,41,59,0.6))]',
                      compact ? 'px-3 text-xs' : 'px-4 text-sm',
                      'text-[var(--c-fg,#334155)] dark:text-[var(--c-fg,#cbd5e1)]',
                      onAction
                        ? 'cursor-pointer hover:bg-[var(--c-surface-2,#f8fafc)] dark:hover:bg-[var(--c-surface-2,rgba(30,41,59,0.4))]'
                        : 'hover:bg-[var(--c-surface-2,rgba(248,250,252,0.5))] dark:hover:bg-[var(--c-surface-2,rgba(30,41,59,0.3))]',
                      isActive && 'bg-[var(--c-row-highlight,var(--c-accent-soft,rgba(239,246,255,0.6)))] dark:bg-[var(--c-row-highlight,var(--c-accent-soft,rgba(30,58,138,0.15)))]',
                      row.getIsSelected() && 'bg-[var(--c-row-highlight,var(--c-accent-soft,rgba(239,246,255,0.4)))] dark:bg-[var(--c-row-highlight,var(--c-accent-soft,rgba(30,58,138,0.1)))]',
                      diffRowClass,
                    )}
                    style={tableGridStyle}
                    onClick={() => handleRowClick(row.original, row.id)}
                    onContextMenu={enableContextMenu ? (e) => handleContextMenu(e, row.original, row.id) : undefined}
                  >
                    {row.getVisibleCells().map((cell, cellIdx) => {
                      const isFirst = cellIdx === 0 && stickyFirstColumn;
                      const isSystemCol = cell.column.id.startsWith('__');
                      const isActions = cell.column.id === '__actions';
                      const externalHref = isSystemCol ? null : asHttpUrl(cell.getValue());
                      return (
                        <div
                          key={cell.id}
                          className={cn(
                            'relative min-w-0',
                            !isSystemCol && 'overflow-hidden',
                            compact ? 'py-1.5 pr-1.5' : 'py-2 pr-2',
                            !isSystemCol && (externalHref ? '!pr-10' : '!pr-6'),
                            (cell.column.columnDef.meta as Record<string, unknown>)?.align === 'right' && 'text-right',
                            isFirst && 'sticky left-0 z-[1] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]',
                            isActions && 'sticky right-0 z-[2] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]',
                          )}
                          style={
                            isFirst || isActions
                              ? {
                                  // Sticky cells need an opaque base so scrolled content can't
                                  // bleed through. When the row is selected/active, layer the same
                                  // row-highlight tint the row carries over that base, so the
                                  // highlight reads as one continuous band instead of leaving the
                                  // sticky checkbox/actions columns white.
                                  background:
                                    row.getIsSelected() || isActive
                                      ? 'linear-gradient(var(--c-row-highlight, var(--c-accent-soft)), var(--c-row-highlight, var(--c-accent-soft))), var(--c-surface, var(--color-surface, #fff))'
                                      : 'var(--c-surface, var(--color-surface, #fff))',
                                }
                              : undefined
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          {!isSystemCol && (
                            <>
                              <CellOpenLinkButton href={externalHref} />
                              <CellCopyButton
                                value={cell.getValue()}
                                onCopy={(text) => {
                                  onAction?.('cellClick', {
                                    column: cell.column.id,
                                    value: text,
                                    row: row.original,
                                    rowId: row.id,
                                  });
                                }}
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Expanded content */}
                  {enableExpanding && row.getIsExpanded() && (
                    <div className={cn(
                      'border-b border-slate-100/80 dark:border-slate-800/60',
                      compact ? 'px-3 py-2' : 'px-4 py-3',
                    )}>
                      <pre className="max-h-60 overflow-auto rounded-md bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                        {JSON.stringify(row.original, null, 2)}
                      </pre>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>

      {/* ── Pagination (bottom bar) ── */}
      {enablePagination && filteredByType.length > 0 && (
        <PaginationBar
          mode={serverPagination ? 'server' : 'client'}
          compact={compact}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={handlePageSizeChange}
          totalRows={table.getFilteredRowModel().rows.length}
          pageIndex={table.getState().pagination?.pageIndex ?? 0}
          pageCount={table.getPageCount()}
          canPreviousPage={table.getCanPreviousPage()}
          canNextPage={table.getCanNextPage()}
          onPreviousPage={() => table.previousPage()}
          onNextPage={() => table.nextPage()}
          onGoToPage={(page) => table.setPageIndex(page)}
          serverTotal={serverTotal}
          serverPage={serverPage}
          serverPageCount={serverPageCount}
          onServerPageChange={handleServerPageChange}
          labels={{
            rangeOf: tr('rangeOf', '{start}-{end} of {total}'),
            perPage: tr('perPage', '{n} / page'),
            emptyRows: tr('emptyRows', '0 rows'),
          }}
        />
      )}
    </div>
  );
}
