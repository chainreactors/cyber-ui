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
  CstxNodeBase,
  CstxEdge,
  CstxGraphPayload,
  CSTXDelta,
  CSTXStat,
  CstxChangeKind,
  CstxFieldChange,
  CstxHistoryEntry,
  LayoutConfig,
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
  DataTable,
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

// Timeline components
export {
  CommitGraph,
  CommitTimeline,
  HistoryTimeline,
  LifecyclePlayer,
  LifeRing,
  TaskTimeline,
} from './components/timeline';
export type {
  CommitGraphProps,
  GitGraphData,
  GitCommit,
  GitRef,
  CommitTimelineProps,
  CheckpointSummary,
  CstxDiffSummary,
  HistoryTimelineProps,
  LifecyclePlayerProps,
  LifeRingProps,
  TaskTimelineProps,
  TaskWithStats,
  TaskGraphStats,
} from './components/timeline';

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
} from './components/commit';
export type { CstxFlagToolbarProps, CstxCommitSelectProps, CstxCommitSummary, DiffMetricCardProps } from './components/commit';

// Cell Renderers
export {
  CellRendererRegistry,
  defaultCellRenderers,
  registerBuiltinRenderers,
} from './lib/renderers';
export type { CellRendererFn } from './lib/renderers';

// Column utilities
export type { ColumnConfig } from './components/table/columns';
export { inferColumns, applyExclusions, flattenRow, isMetaKey } from './components/table/columns';

// Table sub-components
export { FlagCell, BatchFlagMenu } from './components/table/sub/FlagCell';
export type { FlagCellProps, BatchFlagMenuProps, BatchFlagMode } from './components/table/sub/FlagCell';

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
  getCstxFlagActionLabel, getCstxFlagAddLabel, getCstxFlagRemoveLabel,
  getCstxFlagActionToast, shouldHideByCstxExcludeMask,
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

// Search components
export {
  NodeCard,
  FacetSidebar,
  ResultList,
  SyntaxGuide,
  CSTX_SYNTAX_SECTIONS,
} from './components/search';
export type {
  NodeCardProps,
  FacetSidebarProps,
  FacetItem,
  FacetGroup,
  ResultListProps,
  SyntaxGuideProps,
  SyntaxSection,
  SyntaxItem,
} from './components/search';

// Search utilities
export {
  SENSITIVE_SIGNAL_CONFIG,
  NODE_TYPE_CONFIG,
  getNodeIcon,
  parseNodeAttributes,
  getRelationshipTypes,
  getNodeConnectionCounts,
  formatFieldLabel,
  NODE_TYPE_META,
  getNodeTypeHoverText,
  getNodeTypeMeta,
} from './lib/nodeTypeConfig';
export type { NodeTypeConfig, ParsedNodeAttributes, FieldImportance, NodeTypeMeta } from './lib/nodeTypeConfig';
export {
  formatFieldValue,
  getStatusColor,
  getSeverityColor as getSearchSeverityColor,
  getBorderAccent,
  getTypeColor,
  isFingerprintSourceCode,
  fingerprintSourceLabel,
  fingerprintSourceTitle,
  formatCount,
  parseRelationships,
  getRelationshipIcon,
  formatRelativeTime,
  formatAbsoluteDate,
} from './lib/searchUtils';
export { rankSearchItems, getSearchPrioritySignals } from './lib/searchRanking';
export type { SearchRankingContext, SearchPrioritySignals } from './lib/searchRanking';
export {
  SEARCH_FILTER_PRESET_METADATA,
  SEARCH_FILTER_PRESET_FALLBACKS,
  DEFAULT_SEARCH_FILTER_PRESET_KEY,
  getSearchPresetMetadata,
} from './lib/searchPresets';
export type { SearchPresetRankingContext, SearchPresetMetadata, SearchFilterPresetFallback } from './lib/searchPresets';
export { classifyFramework, classifyFrameworkNode, FW_CATEGORY_LABELS } from './lib/frameworkClassify';
export type { FwCategory } from './lib/frameworkClassify';
export { SEARCH_REPORT_TEMPLATES, DEFAULT_SEARCH_REPORT_TEMPLATE_ID } from './lib/reportTemplates';
export type {
  CstxReportColumnSpec,
  CstxReportSheetSpec,
  CstxReportTemplate,
  CstxReportPreviewSheet,
  CstxReportPreview,
} from './lib/reportTemplates';

// Utilities
export { cn } from './lib/cn';
