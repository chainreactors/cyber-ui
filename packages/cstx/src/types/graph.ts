import type React from 'react';

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
