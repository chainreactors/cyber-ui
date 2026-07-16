import type React from 'react';

export interface CstxNodeBase {
    id?: string | null;
    cstx_id?: string | null;
    type: string;
    value?: string | null;
    model?: Record<string, unknown>;
    extras?: Record<string, unknown>;
    data_sources?: string[];
    sources?: string[];
    tags?: string[];
    vulnerabilities?: number;
    updated_time?: string | number;
    created_time?: string | number;
    status?: string;
}

export interface CstxNode extends CstxNodeBase {
    [key: string]: unknown;
}

export interface CstxEdge {
    id?: string | null;
    source_id: string;
    target_id: string;
    relation_type: string;
    attrs?: Record<string, unknown>;
    sources?: string[];
    [key: string]: unknown;
}

export interface CstxGraphPayload {
    nodes: CstxNode[];
    edges: CstxEdge[];
    types?: Record<string, unknown>;
}

export interface CSTXDelta {
    added_nodes: number;
    updated_nodes: number;
    removed_nodes: number;
    reactivated_nodes: number;
    added_edges: number;
    updated_edges: number;
    removed_edges: number;
    reactivated_edges: number;
}

export interface CSTXStat {
    nodes: number;
    edges: number;
    node_types: number;
    relation_types: number;
    node_type_counts: Record<string, number>;
    rel_type_counts: Record<string, number>;
    anchor_counts?: Record<string, number>;
    delta?: CSTXDelta | null;
}

export type CstxChangeKind = 'added' | 'updated' | 'removed';

export interface CstxFieldChange {
    field?: string | number;
    old?: unknown;
    new?: unknown;
}

export interface CstxHistoryEntry {
    cstx_id: string;
    checkpoint_id: string;
    created_at: string | number;
    change_kind: CstxChangeKind;
    changed_fields: CstxFieldChange[];
    flow_id?: string;
    task_id?: string;
}

export interface LayoutConfig {
    type: string;
    icon: React.ElementType;
    name: string;
    description?: string;
}
