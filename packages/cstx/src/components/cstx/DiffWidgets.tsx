import React from 'react';

const formatCompactCount = (value: number): string =>
    new Intl.NumberFormat('zh-CN', {notation: 'compact', maximumFractionDigits: 1}).format(value);

export interface DiffMetricCardProps {
    label: string;
    totalLabel: string;
    totalValue: number | string;
    children?: React.ReactNode;
}

export const DiffMetricCard = ({label, totalLabel, totalValue, children}: DiffMetricCardProps) => (
    <div className="rounded-md bg-white px-3 py-2 ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400">{label}</div>
            <div className="text-[11px] text-slate-400">{totalLabel}</div>
        </div>
        <div className="mt-1 text-sm font-semibold tabular-nums text-slate-800">
            {typeof totalValue === 'number' ? totalValue.toLocaleString() : totalValue}
        </div>
        {children && <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] tabular-nums">{children}</div>}
    </div>
);

export const DiffObjectChangeSvg = ({
    added,
    removed,
    modified,
}: {
    added: number;
    removed: number;
    modified: number;
}) => {
    const items = [
        {glyph: '+', value: added, bg: '#ecfdf5', stroke: '#a7f3d0', fill: '#059669'},
        {glyph: '-', value: removed, bg: '#fef2f2', stroke: '#fecaca', fill: '#dc2626'},
        {glyph: '~', value: modified, bg: '#fffbeb', stroke: '#fde68a', fill: '#d97706'},
    ];
    const label = `+${added.toLocaleString()} / -${removed.toLocaleString()} / ~${modified.toLocaleString()}`;
    return (
        <svg
            viewBox="0 0 174 30"
            role="img"
            aria-label={label}
            className="h-8 w-full max-w-[12rem]"
        >
            {items.map((item, index) => (
                <g key={item.glyph} transform={`translate(${index * 58},0)`}>
                    <rect x="0.5" y="3.5" width="53" height="23" rx="5" fill={item.bg} stroke={item.stroke}/>
                    <circle cx="13" cy="15" r="7" fill={item.fill}/>
                    <text x="13" y="18.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">
                        {item.glyph}
                    </text>
                    <text x="25" y="19" fontSize="11.5" fontWeight="700" fill={item.fill}>
                        {formatCompactCount(item.value)}
                    </text>
                </g>
            ))}
        </svg>
    );
};

const NodeIcon = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" className="inline-block">
        <circle cx="5" cy="5" r="4" fill="currentColor" opacity="0.6"/>
    </svg>
);
const EdgeIcon = () => (
    <svg width="12" height="10" viewBox="0 0 12 10" className="inline-block">
        <line x1="1" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
    </svg>
);

const DeltaItem = ({glyph, nodes, edges, color}: {glyph: string; nodes: number; edges: number; color: string}) => {
    if (nodes === 0 && edges === 0) return null;
    return (
        <span className={`inline-flex items-center gap-0.5 ${color}`}>
            <span>{glyph}</span>
            {nodes > 0 && <><NodeIcon/><span>{nodes}</span></>}
            {edges > 0 && <><EdgeIcon/><span>{edges}</span></>}
        </span>
    );
};

export const DiffObjectChangeBadge: React.FC<{stats: Record<string, unknown>}> = ({stats}) => {
    const an = Number(stats.added_nodes ?? 0);
    const ae = Number(stats.added_edges ?? 0);
    const un = Number(stats.updated_nodes ?? 0);
    const ue = Number(stats.updated_edges ?? 0);
    const rn = Number(stats.removed_nodes ?? 0);
    const re = Number(stats.removed_edges ?? 0);
    if (an + ae + un + ue + rn + re === 0) return null;
    return (
        <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] tabular-nums">
            <DeltaItem glyph="+" nodes={an} edges={ae} color="text-emerald-600"/>
            <DeltaItem glyph="~" nodes={un} edges={ue} color="text-amber-500"/>
            <DeltaItem glyph="-" nodes={rn} edges={re} color="text-red-500"/>
        </span>
    );
};
