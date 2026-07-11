// Types
export type {
  JsonPrimitive,
  JsonValue,
  JsonObject,
  SpanConstraint,
  Tone,
  DataSlot,
  PropSlot,
  ComponentManifest,
  BindQuery,
  CellConfig,
  LayoutSection,
  PerspectiveConfig,
  DataResult,
  UseDataQuery,
  CstxNode,
  CstxEdge,
  CstxGraphPayload,
  CSTXDelta,
  CSTXStat,
  CstxChangeKind,
  CstxFieldChange,
  CstxHistoryEntry,
  LayoutConfig,
  AssetNode,
  AssetRelationship,
  AssetGraphData,
  CstxFilterDefinition,
  CstxFilterCategory,
  CstxFilterStage,
} from './types';

// Runtime
export {
  CstxUiProvider,
  useCstxUi,
  ComponentRegistry,
  defaultRegistry,
  GridLayout,
  DataResolver,
  PerspectiveShell,
} from './runtime';
export type {
  CstxUiProviderProps,
  RuntimeComponentProps,
  RegisteredComponent,
  PerspectiveShellProps,
} from './runtime';

// Components
export {
  registerBuiltins,
  CSTXTable,
  cstxTableManifest,
  StatCard,
  statCardManifest,
  PageHeader,
  pageHeaderManifest,
  Sparkline,
  sparklineManifest,
  DistributionBar,
  distributionBarManifest,
  TrendChart,
  trendChartManifest,
  BarChart,
  barChartManifest,
  PieChart,
  pieChartManifest,
  VerticalTimeline,
  verticalTimelineManifest,
} from './components';

// Graph components
export {
  GraphShell,
  GraphToolbar,
  GraphPanelHeader,
  GraphQueryControls,
  GRAPH_QUERY_LIMIT_OPTIONS,
  formatGraphQueryLimitLabel,
} from './components/graph';
export type {
  GraphShellProps,
  GraphToolbarProps,
  GraphPanelHeaderProps,
  GraphQueryControlsProps,
} from './components/graph';

// UI Primitives
export {
  DataState,
  Section,
  LinkRow,
  ItemList,
  LoadingSpinner,
  PageLoader,
  InlineLoader,
  ButtonLoader,
  EmptyState,
  ChartTooltip,
  CARD_CLASS,
} from './components/primitives';
export type {
  DataStateProps,
  SectionProps,
  LinkRowProps,
  ItemListProps,
  LoadingSpinnerProps,
  EmptyStateProps,
  ChartTooltipProps,
} from './components/primitives';

// CSTX domain components
export {
  CstxFlagToolbar,
  CstxCommitSelect,
  buildCstxCommitSearchText,
  formatCstxCommitSelectLabel,
  getCstxCommitId,
  getCstxCommitShortId,
  getCstxCommitThreatCount,
  getCstxCommitValue,
  DiffMetricCard,
  DiffObjectChangeSvg,
  DiffObjectChangeBadge,
} from './components/cstx';
export type { CstxFlagToolbarProps, CstxCommitSelectProps, CstxCommitSummary, DiffMetricCardProps } from './components/cstx';

// Cell Renderers
export {
  CellRendererRegistry,
  defaultCellRenderers,
  registerBuiltinRenderers,
} from './lib/renderers';
export type { CellRendererFn } from './lib/renderers';

// Column utilities
export type { ColumnConfig } from './components/CSTXTable/columns';
export { inferColumns, applyExclusions, flattenRow, isMetaKey } from './components/CSTXTable/columns';

// Color Manager
export {
  ColorManager,
  defaultColorManager,
  getNodeColor,
  getEdgeColor,
  getSeverityColor,
  getSignalColor,
  generateTypeColorMap,
} from './lib/color-manager';
export type { ColorQuality } from './lib/color-manager';

// Search primitives
export { SearchInput } from './lib/SearchInput';
export type { SearchInputProps, DropdownActions } from './lib/SearchInput';
export { useSearchHistory } from './lib/useSearchHistory';
export type { SearchHistoryEntry } from './lib/useSearchHistory';
export { QueryPicker } from './lib/QueryPicker';
export type { QueryPickerProps, QueryPresetItem } from './lib/QueryPicker';

// Hooks
export { useClickOutside } from './lib/useClickOutside';
export { useTypeColorMap } from './lib/useTypeColorMap';
export { usePolling } from './lib/usePolling';
export type { UsePollingOptions, UsePollingReturn } from './lib/usePolling';

// CSTX domain utilities
export { isInternalGraphElementId, getStableNodeLookupId } from './lib/nodeLookup';
export {
  changeKindLabel, lifecycleStatusText, formatCheckpointDelta,
  CSTX_CHANGE_STYLES,
  formatCstxHistoryFieldName, formatCstxHistoryValue, formatCstxFieldChange,
  getCstxHistoryChangedFields, formatCstxHistoryTimeLabel,
  getHistoryEntryTimestamp, sortHistoryOldestFirst, sortHistoryNewestFirst,
} from './lib/cstxHistory';
export type { CstxLifecycle } from './lib/cstxHistory';
export { getCstxFilterQueryText, getCstxFilterDescriptionText, getCstxFilterPayloadString, getCstxFilterPayloadStringArray, getCstxFilterPayloadSummary } from './lib/cstxFilters';
export {
  CSTX_FLAGS, CSTX_FLAGS_ALL, DEFAULT_CSTX_EXCLUDE_MASK, DEFAULT_CSTX_FLAG_FILTER,
  CSTX_FLAG_OPTIONS, normalizeCstxFlagFilterMode, normalizeCstxFlagMask,
  getCstxFlagFilterMasks, getCstxFlags, matchesCstxFlagFilter, filterNodesByCstxFlags,
  getCstxNodeId, filterEdgesByVisibleNodes, isFalsePositive, hasCstxFlag,
  getCstxFlagActionLabel, getCstxFlagActionToast, shouldHideByCstxExcludeMask,
  getCstxNodeLookupId, applyCstxFlagUpdateToItem, countCstxFlagFilter,
} from './lib/cstxFlags';
export type { CstxFlagFilterMode, CstxFlagFilterState, CstxFlagOption } from './lib/cstxFlags';

// Time display
export { TimeDisplay, TimePairDisplay, formatTimeValue, formatShortTimeValue, formatRelativeTimeValue, toDisplayDate } from './lib/timeDisplay';
export type { TimeDisplayValue, TimeDisplayMode, TimePairDisplayItem } from './lib/timeDisplay';

// Chart colors
export { CHART_COLORS } from './lib/chartColors';

// Safe type coercion
export {
  asRecord,
  asString,
  asStringArray,
  asIsoTime,
  asCount,
  ensureArray,
  ensureNumber,
  stripTypePrefix,
  normalizeRelationType,
  normalizeStringArray,
  getRecordStringField,
  getDetailPanelDataId,
  getDetailPanelDataName,
} from './lib/coerce';

// Download utilities
export {
  triggerBlobDownload,
  downloadText,
  encodeCsvValue,
  rowsToCsv,
  downloadJson,
  resolveDownloadFilename,
} from './lib/downloadUtils';

// Snapshot / envelope helpers
export {
  emptySnapshot,
  unwrapSnapshot,
  mergeSnapshots,
  extractGraphPayloadFromEnvelope,
  processBackendResponse,
  parseCstxApiResult,
} from './lib/snapshot';
export type { CstxApiResultEnvelope } from './lib/snapshot';

// CSTX query DSL utilities
export {
  CSTX_NODE_TYPE_NAMES,
  IPV4_LITERAL_RE,
  CIDR_LITERAL_RE,
  CSTX_PATH_OPERATOR_RE,
  CSTX_NODE_FILTER_RE,
  CSTX_FILTER_EXPR_RE,
  CSTX_BARE_NODE_TYPE_RE,
  escapeCstxString,
  buildCstxNameSelector,
  quoteCstxFilterValue,
  normalizeCstxQueryExpression,
} from './lib/cstxQuery';

// Utilities
export { cn } from './lib/cn';
