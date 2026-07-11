import React, {useState} from 'react';
import {Filter, ChevronRight} from 'lucide-react';
import {Badge} from '@cyber/ui';
import {getNodeTypeHoverText} from '../../lib/nodeTypeMeta';

export interface FacetItem {
    value: string;
    count: number;
}

export interface FacetGroup {
    key: string;
    label: string;
    items: FacetItem[];
}

export interface FacetSidebarProps {
    typeCounts: Record<string, number>;
    selectedTypes: string[];
    onTypeToggle: (type: string) => void;
    facets: FacetGroup[];
    onFacetClick: (key: string, value: string) => void;
}

const COLLAPSED_LIMIT = 5;

export function FacetSidebar({
    typeCounts,
    selectedTypes,
    onTypeToggle,
    facets,
    onFacetClick,
}: FacetSidebarProps) {
    const [typeOpen, setTypeOpen] = useState(true);
    const [expandedFacets, setExpandedFacets] = useState<Set<string>>(new Set());
    const [collapsedFacets, setCollapsedFacets] = useState<Set<string>>(new Set());

    const toggleFacetExpand = (key: string) => {
        setExpandedFacets(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleFacetCollapse = (key: string) => {
        setCollapsedFacets(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div className="space-y-2">
            <div>
                <button
                    className="flex items-center justify-between w-full px-1 mb-1 group"
                    onClick={() => setTypeOpen(v => !v)}
                >
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Asset Types
                    </h3>
                    <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform duration-150 ${typeOpen ? 'rotate-90' : ''}`}/>
                </button>
                {typeOpen && (
                    <div className="space-y-0.5">
                        {Object.entries(typeCounts)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .map(([type, count]) => (
                                <button
                                    key={type}
                                    onClick={() => onTypeToggle(type)}
                                    title={getNodeTypeHoverText(type)}
                                    className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                                        selectedTypes.includes(type)
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-interactive-hover'
                                    }`}
                                >
                                    <span>{type}</span>
                                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                        {count}
                                    </Badge>
                                </button>
                            ))}
                    </div>
                )}
            </div>

            {facets.map((facet) => {
                const isCollapsed = collapsedFacets.has(facet.key);
                const isExpanded = expandedFacets.has(facet.key);
                const visibleItems = isExpanded ? facet.items : facet.items.slice(0, COLLAPSED_LIMIT);
                const hasMore = facet.items.length > COLLAPSED_LIMIT;

                return (
                    <div key={facet.key}>
                        <button
                            className="flex items-center justify-between w-full px-1 mb-1 group"
                            onClick={() => toggleFacetCollapse(facet.key)}
                        >
                            <div className="flex items-center gap-1.5">
                                <Filter className="w-3 h-3 text-primary"/>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {facet.label}
                                </h3>
                            </div>
                            <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`}/>
                        </button>
                        {!isCollapsed && (
                            <div className="space-y-0.5">
                                {visibleItems.map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => onFacetClick(facet.key, item.value)}
                                        className="w-full flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-interactive-hover transition-colors group"
                                    >
                                        <span className="truncate text-foreground/80">{item.value}</span>
                                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] flex-shrink-0">
                                            {item.count}
                                        </Badge>
                                    </button>
                                ))}
                                {hasMore && (
                                    <button
                                        onClick={() => toggleFacetExpand(facet.key)}
                                        className="w-full text-center px-2 py-1 text-[10px] text-primary hover:underline"
                                    >
                                        {isExpanded ? 'Collapse' : `Show more (${facet.items.length - COLLAPSED_LIMIT})`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
