import React from 'react';
import {NodeCard} from './NodeCard';

export interface ResultListProps {
    items: any[];
    emptyText?: string;
    onQuickFilter?: (filterQuery: string) => void;
}

const noopMouseHandler = () => {};
const noopNodeHandler = () => {};

export function ResultList({
    items,
    emptyText = 'No matching data',
    onQuickFilter,
}: ResultListProps) {
    if (!items.length) {
        return (
            <div className="rounded-lg border border-dashed border-border/60 px-2 py-2 text-center text-sm text-muted-foreground">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            {items.map((node, index) => (
                <NodeCard
                    key={node.cstx_id ?? node.id ?? `${node.name ?? 'node'}-${index}`}
                    node={node}
                    onViewDetails={noopNodeHandler}
                    onViewInGraph={noopMouseHandler}
                    onQuickFilter={onQuickFilter}
                    density="compact"
                />
            ))}
        </div>
    );
}
