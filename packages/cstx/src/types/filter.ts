export type CstxFilterCategory = 'asset' | 'risk' | 'lifecycle' | 'posture' | 'custom' | string;
export type CstxFilterStage = 1 | 2;

export interface CstxFilterDefinition {
    id: string;
    project_id?: string;
    name: string;
    description?: string | null;
    category: CstxFilterCategory;
    preset_key?: string | null;
    is_system?: boolean;
    sort_order?: number;
    stage: CstxFilterStage;
    query_payload: Record<string, unknown>;
    enabled: boolean;
    created_at?: number;
    updated_at?: number;
}
