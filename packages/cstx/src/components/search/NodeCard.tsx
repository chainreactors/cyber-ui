import React from 'react';
import {Eye, MapPin, Clock, CheckSquare, GitBranch, Bot, FolderTree, Flag, FlagOff, ChevronDown, Link2, Fingerprint} from 'lucide-react';
import {Card, CardContent} from '@cyber/ui';
import {Badge} from '@cyber/ui';
import {Checkbox} from '@cyber/ui';
import {Popover, PopoverClose, PopoverContent, PopoverTrigger} from '@cyber/ui';
import {Button} from '@cyber/ui';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@cyber/ui';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@cyber/ui';
import {getNodeIcon, parseNodeAttributes} from '../../lib/nodeTypeConfig';
import {classifyFrameworkNode} from '../../lib/frameworkClassify';
import {
    formatFieldValue,
    getStatusColor,
    getSeverityColor,
    getBorderAccent,
    getTypeColor,
    formatRelativeTime,
    formatAbsoluteDate,
    isFingerprintSourceCode,
    fingerprintSourceTitle,
    fingerprintSourceLabel,
} from '../../lib/searchUtils';
import {triggerBlobDownload} from '../../lib/downloadUtils';
import {CSTX_FLAG_OPTIONS, getCstxFlagActionLabel, hasCstxFlag, type CstxFlagOption} from '../../lib/cstxFlags';
import {getStableNodeLookupId} from '../../lib/nodeLookup';
import {formatTimeValue} from '../../lib/timeDisplay';

const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    triggerBlobDownload(blob, filename);
};

export interface NodeCardProps {
    node: any;
    onViewDetails: (node: any) => void;
    onViewInGraph: (e: React.MouseEvent, node: any) => void;
    onViewRelations?: (node: any, relationType: string) => void;
    onViewLineage?: (node: any) => void;
    onToggleCstxFlag?: (node: any, option: CstxFlagOption) => void;
    cstxFlagUpdating?: boolean;
    onQuickFilter?: (filterQuery: string) => void;
    onOpenPanel?: (type: 'task' | 'flow' | 'worker' | 'ability', id: string) => void;
    selected?: boolean;
    onSelect?: (nodeId: string, selected: boolean) => void;
    density?: 'compact' | 'comfortable' | 'detailed';
    focused?: boolean;
    renderImage?: (props: {fileId: string; alt: string; className: string}) => React.ReactNode;
    renderEntityBadge?: (type: string, value: string) => React.ReactNode;
}

const HEADER_BADGE_KEYS = new Set(['severity', 'status_code']);
const DETAIL_EXCLUDED_KEYS = new Set([
    'name', 'type', 'cstx_id', 'value',
    'source', 'sources', 'tags',
    'created_at', 'updated_at', 'created_time', 'updated_time', 'last_seen',
    'project_id', 'project',
    'cstx_flags',
    'severity', 'status_code',
    'screenshot_id', 'screenshot', 'screenshot_url',
    '_extra', '__type__', '__node_type__',
]);

const getBadgeClass = (key: string, value: string): string => {
    if (key === 'severity')    return `text-[10px] h-4 px-1.5 ${getSeverityColor(value)}`;
    if (key === 'status_code') return `text-[10px] h-4 px-1.5 ${getStatusColor(value)}`;
    if (key === 'cdn_name' || key === 'waf_name' || key === 'cloud_name')
        return 'text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
    return 'text-[10px] h-4 px-1.5';
};

const hasDisplayValue = (value: unknown): boolean => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    return true;
};

const getRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
);

const collectFrameworkValues = (value: unknown): string[] => {
    const values: string[] = [];
    const push = (item: unknown, fallback?: string) => {
        if (typeof item === 'string' || typeof item === 'number') {
            const text = String(item).trim();
            if (text) values.push(text);
            return;
        }
        if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            const name = record.name ?? record.framework ?? record.product ?? fallback;
            if (typeof name === 'string' || typeof name === 'number') {
                const text = String(name).trim();
                if (text) values.push(text);
            }
            return;
        }
        if (fallback) values.push(fallback);
    };

    if (Array.isArray(value)) {
        value.forEach(item => push(item));
    } else if (value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
            push(item, key);
        });
    } else {
        push(value);
    }

    return [...new Set(values)];
};

const buildCardAttributes = (node: any): Record<string, unknown> => {
    const attributes = {...getRecord(node?.attributes)};
    const extras = getRecord(node?.extras);
    const copyIfMissing = (key: string, ...values: unknown[]) => {
        if (hasDisplayValue(attributes[key])) return;
        const value = values.find(hasDisplayValue);
        if (value !== undefined) {
            attributes[key] = value;
        }
    };

    copyIfMissing('sources', node?.sources, extras.sources);
    copyIfMissing('tags', node?.tags, extras.tags);
    copyIfMissing('semantic_frameworks', node?.semantic_frameworks, extras.semantic_frameworks);
    copyIfMissing('fingerprints', node?.fingerprints, extras.fingerprints);
    copyIfMissing('created_time', node?.created_time, node?.created_at, extras.created_time, extras.created_at);
    copyIfMissing('updated_time', node?.updated_time, node?.updated_at, extras.updated_time, extras.updated_at);

    const frameworks = collectFrameworkValues(
        hasDisplayValue(attributes.frameworks) ? attributes.frameworks : [
            node?.frameworks,
            extras.frameworks,
            attributes.fingerprints,
            node?.fingerprints,
            extras.fingerprints,
        ].find(hasDisplayValue),
    );
    if (frameworks.length > 0) {
        attributes.frameworks = frameworks;
    }

    return attributes;
};

const ASSOC_COLORS = {
    task:    {icon: 'text-blue-500',    chip: 'bg-blue-50   text-blue-700   hover:bg-blue-100   dark:bg-blue-950/50  dark:text-blue-300  dark:hover:bg-blue-900/60'},
    flow:    {icon: 'text-purple-500',  chip: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-900/60'},
    worker:  {icon: 'text-amber-500',   chip: 'bg-amber-50  text-amber-700  hover:bg-amber-100  dark:bg-amber-950/50  dark:text-amber-300  dark:hover:bg-amber-900/60'},
    project: {icon: 'text-emerald-500', chip: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60'},
} as const;

const ASSOC_LABELS: Record<string, {label: string; description: string}> = {
    task: {label: 'Task', description: 'Scan task that produced this asset'},
    flow: {label: 'Flow', description: 'Execution flow that produced this asset'},
    worker: {label: 'Worker', description: 'Worker unit that produced this asset'},
    project: {label: 'Project', description: 'Project boundary for this asset'},
};

type LineageType = keyof typeof ASSOC_COLORS;

interface LineageGroup {
    type: LineageType;
    icon: React.ElementType;
    ids: string[];
    onChipClick?: (id: string) => void;
}

const LineagePopover = ({groups}: {groups: LineageGroup[]}) => {
    const total = groups.reduce((sum, g) => sum + g.ids.length, 0);
    if (total === 0) return null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary flex-shrink-0"
                    title="View asset lineage: related tasks / flows / workers / projects"
                >
                    <Link2 className="w-3 h-3"/>
                    <span>Lineage</span>
                    <span className="font-medium tabular-nums">{total}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-72 p-0"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <div className="border-b border-border/60 px-2 py-2">
                    <div className="text-xs font-medium text-foreground">Asset Lineage</div>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                        Scan chain that produced this asset - {total} items
                    </p>
                </div>
                <div className="max-h-72 overflow-y-auto p-2 space-y-2">
                    {groups.filter(g => g.ids.length > 0).map(group => {
                        const {icon: iconCls, chip: chipCls} = ASSOC_COLORS[group.type];
                        const termMeta = ASSOC_LABELS[group.type] ?? {label: group.type, description: ''};
                        const Icon = group.icon;
                        return (
                            <div key={group.type} className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconCls}`}/>
                                    <span className="text-xs font-medium text-foreground">{termMeta.label}</span>
                                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{group.ids.length}</span>
                                </div>
                                <p className="text-[10px] leading-4 text-muted-foreground pl-5">
                                    {termMeta.description}
                                </p>
                                <div className="flex flex-wrap gap-1 pl-5">
                                    {group.ids.map(id => {
                                        const clickable = Boolean(group.onChipClick);
                                        const className = `px-1.5 py-0.5 rounded font-mono text-[10px] transition-colors ${chipCls} ${
                                            clickable ? 'cursor-pointer' : 'cursor-default opacity-80'
                                        }`;
                                        if (!clickable) {
                                            return (
                                                <span key={id} className={className} title={`${termMeta.label} - ${id}`}>
                                                    ...{id.slice(-6)}
                                                </span>
                                            );
                                        }
                                        const chipButton = (
                                            <button
                                                key={id}
                                                type="button"
                                                className={className}
                                                title={`Open ${termMeta.label} detail - ${id}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    group.onChipClick?.(id);
                                                }}
                                            >
                                                ...{id.slice(-6)}
                                            </button>
                                        );
                                        return (
                                            <PopoverClose key={id} asChild>
                                                {chipButton}
                                            </PopoverClose>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export const NodeCard = React.memo(function NodeCard({
    node,
    onViewDetails,
    onViewInGraph,
    onViewRelations: _onViewRelations,
    onViewLineage,
    onToggleCstxFlag,
    cstxFlagUpdating = false,
    onQuickFilter,
    onOpenPanel,
    selected = false,
    onSelect,
    density: _density,
    focused = false,
    renderImage,
    renderEntityBadge,
}: NodeCardProps) {
    const nodeId = getStableNodeLookupId(node) || String(node.id ?? '');
    const Icon = getNodeIcon(node.type);
    const nodeAttributes = buildCardAttributes(node);
    const {badges, fields} = parseNodeAttributes(nodeAttributes, node.type);
    const fwCategory = classifyFrameworkNode(node);
    if (fwCategory) {
        badges.unshift({
            key: 'fw_category',
            value: fwCategory.label,
            label: 'Category',
            fixed: true,
            importance: 'important',
        });
    }
    const borderAccent = getBorderAccent(node);
    const activeFlagLabels = CSTX_FLAG_OPTIONS
        .filter(option => hasCstxFlag(node, option.value))
        .map(option => option.label);
    const flagButtonTitle = activeFlagLabels.length > 0
        ? `Flagged: ${activeFlagLabels.join(', ')}`
        : 'Select flag type';

    const headerBadges = badges.filter(b => HEADER_BADGE_KEYS.has(b.key));
    const attrBadges   = badges.filter(b => !HEADER_BADGE_KEYS.has(b.key));

    const importantBadges = attrBadges.filter(b => b.importance === 'important');
    const normalBadges = attrBadges.filter(b => b.importance !== 'important');
    const importantFields = fields.filter(f => f.importance === 'important');
    const normalFields = fields.filter(f => f.importance !== 'important');

    const taskIds   = Array.isArray(node.task_ids)   ? node.task_ids   : [];
    const flowIds   = Array.isArray(node.flow_ids)   ? node.flow_ids   : [];
    const workerIds = Array.isArray(node.worker_ids) ? node.worker_ids : [];

    const sources: string[] = (() => {
        const v = nodeAttributes.sources;
        return !v ? [] : Array.isArray(v) ? v.map(String) : [String(v)];
    })();

    const handleCardClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, a, [role="button"], [data-checkbox]')) return;
        onViewDetails(node);
    };

    const handleCheckboxChange = (checked: boolean) => {
        if (onSelect && nodeId) onSelect(nodeId, checked);
    };

    const handleQuickFilter = (field: string, value: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onQuickFilter) onQuickFilter(`${field}="${value}"`);
    };

    const handleSourceClick = (src: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onOpenPanel) onOpenPanel('ability', src);
        else if (onQuickFilter) onQuickFilter(`source="${src}"`);
    };

    const openPanel = onOpenPanel
        ? (type: 'task' | 'flow' | 'worker') => (id: string) => onOpenPanel(type, id)
        : undefined;

    const handleCopyName  = async () => { await copyToClipboard(node.name); };
    const handleCopyId    = async () => { await copyToClipboard(nodeId); };
    const handleCopyJSON  = async () => { await copyToClipboard(JSON.stringify(node, null, 2)); };
    const handleExportJSON = () => { downloadJson([node], `node-${node.name}-${Date.now()}.json`); };

    const rawScreenshotId = nodeAttributes.screenshot_id;
    const screenshotId = typeof rawScreenshotId === 'string' && rawScreenshotId.trim()
        ? rawScreenshotId.trim()
        : null;
    const createdTime = node.created_time ?? node.created_at ?? nodeAttributes.created_time ?? nodeAttributes.created_at;
    const hasCreatedTime = formatTimeValue(createdTime, '') !== '';

    const keyInfoItems = [
        ...importantBadges.map(({key, value, label}) => ({key, value, label})),
        ...importantFields.map(({key, value, label}) => ({key, value, label})),
    ];
    const keyInfoKeys = new Set(keyInfoItems.map(({key}) => key));
    const seenDetailKeys = new Set<string>();
    const detailItems = [
        ...normalBadges.map(({key, value, label}) => ({key, value, label})),
        ...normalFields.map(({key, value, label}) => ({key, value, label})),
    ].filter(({key}) => {
        if (DETAIL_EXCLUDED_KEYS.has(key) || keyInfoKeys.has(key) || seenDetailKeys.has(key)) return false;
        seenDetailKeys.add(key);
        return true;
    });
    const hasKeyInfo = keyInfoItems.length > 0;
    const hasDetails = screenshotId !== null || detailItems.length > 0;
    const hasBody = hasKeyInfo || hasDetails;

    const renderValue = (
        key: string,
        value: any,
        emphasize: boolean,
        className: string,
    ) => {
        const isScalar = !Array.isArray(value) && typeof value !== 'object';
        const formattedValue = formatFieldValue(key, value);
        return (
            <span
                className={`min-w-0 truncate ${emphasize ? 'font-medium text-foreground' : 'text-foreground/80'} ${
                    isScalar ? 'cursor-pointer hover:text-primary hover:underline transition-colors' : ''
                } ${className}`}
                title={formattedValue}
                onClick={isScalar ? (e) => handleQuickFilter(key, String(value), e as React.MouseEvent) : undefined}
            >
                {formattedValue}
            </span>
        );
    };

    const renderKeyInfoItem = ({key, value, label}: {key: string; value: any; label: string}) => (
        <div
            key={key}
            className="grid min-w-0 grid-cols-[76px_minmax(0,1fr)] items-center gap-2 rounded-md bg-primary/[0.04] px-2 py-1 text-xs"
            data-key-info={key}
        >
            <span className="truncate text-primary/85" title={key}>
                {label}
            </span>
            {renderValue(key, value, true, '')}
        </div>
    );

    const renderDetailItem = ({key, value, label}: {key: string; value: any; label: string}) => (
        <div
            key={key}
            className="grid min-w-0 grid-cols-[minmax(78px,0.42fr)_minmax(0,1fr)] gap-2 text-[11px] leading-5"
            data-detail-key={key}
        >
            <span
                className="min-w-0 truncate font-mono text-muted-foreground"
                title={label === key ? key : `${label} (${key})`}
            >
                {key}:
            </span>
            {renderValue(key, value, false, 'font-mono')}
        </div>
    );

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <Card
                    data-testid="search-result-card"
                    className={`cursor-pointer hover:shadow-md transition-all duration-150 hover:border-primary/40 py-2 ${borderAccent} ${focused ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                    onClick={handleCardClick}
                >
                    <CardContent className="px-2 py-2">
                        <div className="flex min-w-0 items-center gap-1">
                            {onSelect && (
                                <Checkbox
                                    checked={selected}
                                    onCheckedChange={handleCheckboxChange}
                                    data-checkbox
                                    className="flex-shrink-0"
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                />
                            )}
                            <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 self-start mt-0.5"/>
                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <span
                                    className="text-sm font-medium text-foreground truncate leading-none"
                                    title={node.name}
                                >
                                    {node.name}
                                </span>
                                {sources.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {sources.map((src, i) => (
                                            isFingerprintSourceCode(src) ? (
                                                <Badge
                                                    key={i}
                                                    variant="outline"
                                                    className="text-[9px] h-3 px-1 py-0 font-normal opacity-55 cursor-help gap-0.5"
                                                    title={fingerprintSourceTitle(src)}
                                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                >
                                                    <Fingerprint className="w-2 h-2"/>
                                                    {fingerprintSourceLabel(src)}
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    key={i}
                                                    variant="outline"
                                                    className="text-[9px] h-3 px-1 py-0 font-normal cursor-pointer opacity-55 hover:opacity-100 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                                                    title={`Open capability: ${src}`}
                                                    onClick={(e: React.MouseEvent) => handleSourceClick(src, e)}
                                                >
                                                    {src}
                                                </Badge>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>

                            <LineagePopover
                                groups={[
                                    {type: 'task',    icon: CheckSquare, ids: taskIds,   onChipClick: openPanel?.('task')},
                                    {type: 'flow',    icon: GitBranch,   ids: flowIds,   onChipClick: openPanel?.('flow')},
                                    {type: 'worker',  icon: Bot,         ids: workerIds, onChipClick: openPanel?.('worker')},
                                    {type: 'project', icon: FolderTree,  ids: node.project_id ? [node.project_id] : []},
                                ]}
                            />

                            {hasCreatedTime && (
                                <span
                                    className="flex items-center gap-0.5 text-[10px] text-muted-foreground opacity-55 flex-shrink-0"
                                    title={formatAbsoluteDate(createdTime)}
                                >
                                    <Clock className="w-2.5 h-2.5"/>
                                    {formatRelativeTime(createdTime)}
                                </span>
                            )}

                            {headerBadges.map(({key, value}) => (
                                <Badge
                                    key={key}
                                    variant="outline"
                                    className={`${getBadgeClass(key, value)} flex-shrink-0`}
                                >
                                    {value}
                                </Badge>
                            ))}

                            {renderEntityBadge ? (
                                renderEntityBadge('nodeType', node.type)
                            ) : (
                                <Badge
                                    variant="secondary"
                                    className={`text-[10px] h-4 px-1.5 flex-shrink-0 ${getTypeColor(node.type)}`}
                                >
                                    {node.type}
                                </Badge>
                            )}

                            <button
                                onClick={(e) => { e.stopPropagation(); onViewDetails(node); }}
                                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                title="View details"
                            >
                                <Eye className="w-3.5 h-3.5"/>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onViewInGraph(e, node); }}
                                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                title="View in graph"
                            >
                                <MapPin className="w-3.5 h-3.5"/>
                            </button>
                            {onToggleCstxFlag && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                            disabled={cstxFlagUpdating}
                                            className={`h-6 flex-shrink-0 gap-0.5 rounded px-1.5 transition-colors disabled:opacity-50 ${
                                                activeFlagLabels.length > 0
                                                    ? 'text-amber-600 hover:text-amber-700'
                                                    : 'text-muted-foreground hover:text-amber-600'
                                            }`}
                                            title={flagButtonTitle}
                                        >
                                            {activeFlagLabels.length > 0
                                                ? <FlagOff className="w-3.5 h-3.5"/>
                                                : <Flag className="w-3.5 h-3.5"/>}
                                            <ChevronDown className="w-3 h-3 opacity-70"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-36">
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                                            Select Flag
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator/>
                                        {CSTX_FLAG_OPTIONS.map(option => {
                                            const active = hasCstxFlag(node, option.value);
                                            return (
                                                <DropdownMenuItem
                                                    key={option.key}
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        onToggleCstxFlag(node, option);
                                                    }}
                                                    disabled={cstxFlagUpdating}
                                                    className="gap-2"
                                                >
                                                    {active
                                                        ? <FlagOff className="w-3.5 h-3.5 text-amber-600"/>
                                                        : <Flag className="w-3.5 h-3.5"/>}
                                                    <span>{getCstxFlagActionLabel(node, option)}</span>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {onViewLineage && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewLineage(node); }}
                                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                    title="Data lineage"
                                >
                                    <GitBranch className="w-3.5 h-3.5"/>
                                </button>
                            )}
                        </div>

                        {hasBody && (
                            <div
                                className={`mt-1.5 grid gap-2 border-t border-border/60 pt-1.5 ${
                                    hasKeyInfo
                                        ? 'md:grid-cols-[minmax(0,0.4fr)_minmax(260px,0.6fr)]'
                                        : 'grid-cols-1'
                                }`}
                            >
                                {hasKeyInfo && (
                                    <div className="min-w-0 space-y-1.5">
                                        <div className="grid min-w-0 gap-1">
                                            {keyInfoItems.map(renderKeyInfoItem)}
                                        </div>
                                    </div>
                                )}

                                {hasDetails && (
                                    <div
                                        className={`min-w-0 space-y-1.5 ${
                                            hasKeyInfo ? 'md:border-l md:border-border/60 md:pl-2' : ''
                                        }`}
                                    >
                                        {screenshotId && renderImage && (
                                            renderImage({
                                                fileId: screenshotId,
                                                alt: 'Screenshot',
                                                className: 'h-40 w-full rounded-md border border-border/60 bg-muted/20 object-cover object-top',
                                            })
                                        )}
                                        {screenshotId && !renderImage && (
                                            <img
                                                src={`/api/files/${screenshotId}`}
                                                alt="Screenshot"
                                                className="h-40 w-full rounded-md border border-border/60 bg-muted/20 object-cover object-top"
                                                loading="lazy"
                                            />
                                        )}

                                        {detailItems.length > 0 && (
                                            <div className="max-h-28 min-w-0 overflow-y-auto rounded-md border border-border/50 bg-muted/20 px-2 py-1.5">
                                                {detailItems.map(renderDetailItem)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </ContextMenuTrigger>

            <ContextMenuContent>
                <ContextMenuItem onClick={handleCopyName}>Copy Name</ContextMenuItem>
                <ContextMenuItem onClick={handleCopyId}>Copy ID</ContextMenuItem>
                <ContextMenuItem onClick={handleCopyJSON}>Copy as JSON</ContextMenuItem>
                <ContextMenuSeparator/>
                <ContextMenuItem onClick={handleExportJSON}>Export as JSON</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
});
