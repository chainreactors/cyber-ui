/* tslint:disable */
/* eslint-disable */

export class CSTX {
    free(): void;
    [Symbol.dispose](): void;
    close(): void;
    constructor(config?: any | null);
    readonly closed: boolean;
    readonly extensions: Extensions;
    readonly graph: Graph;
    readonly repository: Repository;
}

export class Extensions {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    anchorConcepts(): any;
    contains(node_type: string): boolean;
    enable(name: string): void;
    info(name: string): any;
    list(): any;
    parsesArtifact(artifact: string): boolean;
    register(contract: any): void;
    schema(node_type: string): any;
    schemas(): any;
}

export class Graph {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    addNode(node: any): bigint;
    addNodes(nodes: any): bigint;
    addRelationship(source_id: string, target_id: string, relation: string, sources?: string[] | null, model?: any | null, identity_key?: string | null): any;
    addRelationships(relationships: any): bigint;
    /**
     * Execute the single typed graph algorithm atom.
     */
    analyze(algorithm: any, selection?: string | null): any;
    contains(node_id: string): boolean;
    degree(node_id: string, direction?: string | null): bigint;
    difference(other: Graph, node_type?: string | null): CSTX;
    elevate(concept_name: string): CSTX;
    filter(exclude_mask?: bigint | null, include_mask?: bigint | null, excluded_ids?: string[] | null): CSTX;
    findAnchors(concept_name: string): any;
    findNode(identifier: string): any;
    inducedSubgraph(node_ids: string[], edge_ids?: string[] | null): CSTX;
    link(node_ids: string[], data_source: string): any;
    merge(other: Graph): bigint;
    neighbors(node_id: string, direction?: string | null, options?: any | null): GraphCursor;
    node(node_id: string): any;
    nodeCount(): bigint;
    nodeTypes(): any;
    nodes(options?: any | null): GraphCursor;
    /**
     * Parse one extension artifact without mutating this graph.
     */
    parse(plugin: string, artifact: string, data: Uint8Array): any;
    patchNodeAnnotations(node_ids: string[] | null | undefined, patch: any): bigint;
    query(expression: string, options?: any | null): GraphCursor;
    querySubgraph(expression: string, limit?: number | null, page?: number | null, exclude_mask?: bigint | null, include_mask?: bigint | null): CSTX;
    relationship(relationship_id: string): any;
    relationshipCount(): bigint;
    relationships(options?: any | null): GraphCursor;
    stats(selection?: string | null, exclude_mask?: bigint | null, include_mask?: bigint | null): any;
    subgraph(seed_ids?: string[] | null, depth?: number | null): CSTX;
    union(other: Graph): CSTX;
    updateNodeFlags(node_ids: string[], add?: bigint | null, remove?: bigint | null, set_to?: bigint | null): bigint;
}

export class GraphCursor {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    close(): void;
    next(): any;
    page(limit: number, page: number): any;
    readonly closed: boolean;
    /**
     * Return the logical row shape emitted by this cursor.
     */
    readonly kind: string;
}

export class Repository {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    branch(name: string, start_point?: string | null): string;
    checkout(revision?: string | null, force?: boolean | null): any;
    commit(message: string, ref_name?: string | null, expected_head?: string | null, metadata?: any | null, timestamp?: bigint | null): any;
    delta(revision?: string | null, start_timestamp?: bigint | null, end_timestamp?: bigint | null): any;
    diff(base: string, head: string, limit?: number | null, detail?: string | null): any;
    head(ref_name?: string | null): any;
    history(entity_id: string, revision?: string | null, limit?: number | null): any;
    log(revision?: string | null, limit?: number | null): any;
    merge(source: string, target?: string | null, expected_head?: string | null, message?: string | null): any;
    resolve(revision: string): string;
    stat(revision?: string | null, exclude_mask?: bigint | null, include_mask?: bigint | null): any;
}

export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_cstx_free: (a: number, b: number) => void;
    readonly cstx_new: (a: number, b: number) => void;
    readonly cstx_extensions: (a: number) => number;
    readonly cstx_closed: (a: number) => number;
    readonly cstx_close: (a: number) => void;
    readonly __wbg_extensions_free: (a: number, b: number) => void;
    readonly extensions_register: (a: number, b: number, c: number) => void;
    readonly extensions_enable: (a: number, b: number, c: number, d: number) => void;
    readonly extensions_list: (a: number, b: number) => void;
    readonly extensions_info: (a: number, b: number, c: number, d: number) => void;
    readonly extensions_contains: (a: number, b: number, c: number, d: number) => void;
    readonly extensions_schema: (a: number, b: number, c: number, d: number) => void;
    readonly extensions_schemas: (a: number, b: number) => void;
    readonly extensions_parsesArtifact: (a: number, b: number, c: number, d: number) => void;
    readonly extensions_anchorConcepts: (a: number, b: number) => void;
    readonly graph_parse: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly graph_addNode: (a: number, b: number, c: number) => void;
    readonly graph_addNodes: (a: number, b: number, c: number) => void;
    readonly graph_addRelationships: (a: number, b: number, c: number) => void;
    readonly graph_node: (a: number, b: number, c: number, d: number) => void;
    readonly graph_relationship: (a: number, b: number, c: number, d: number) => void;
    readonly graph_findNode: (a: number, b: number, c: number, d: number) => void;
    readonly graph_addRelationship: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => void;
    readonly graph_patchNodeAnnotations: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly graph_union: (a: number, b: number, c: number) => void;
    readonly graph_merge: (a: number, b: number, c: number) => void;
    readonly graph_difference: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly graph_nodeTypes: (a: number, b: number) => void;
    readonly graph_link: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly graph_updateNodeFlags: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: bigint, i: number, j: bigint) => void;
    readonly graph_contains: (a: number, b: number, c: number, d: number) => void;
    readonly graph_nodeCount: (a: number, b: number) => void;
    readonly graph_relationshipCount: (a: number, b: number) => void;
    readonly graph_stats: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: bigint) => void;
    readonly graph_degree: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly graph_nodes: (a: number, b: number, c: number) => void;
    readonly graph_relationships: (a: number, b: number, c: number) => void;
    readonly graph_neighbors: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly graph_query: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly graph_analyze: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly graph_subgraph: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly graph_querySubgraph: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: bigint, i: number, j: bigint) => void;
    readonly graph_inducedSubgraph: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly graph_filter: (a: number, b: number, c: number, d: bigint, e: number, f: bigint, g: number, h: number) => void;
    readonly graph_findAnchors: (a: number, b: number, c: number, d: number) => void;
    readonly graph_elevate: (a: number, b: number, c: number, d: number) => void;
    readonly repository_resolve: (a: number, b: number, c: number, d: number) => void;
    readonly repository_checkout: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly repository_commit: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: bigint) => void;
    readonly repository_diff: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly repository_head: (a: number, b: number, c: number, d: number) => void;
    readonly repository_branch: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly repository_history: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly repository_log: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly repository_merge: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
    readonly repository_stat: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: bigint) => void;
    readonly repository_delta: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: bigint) => void;
    readonly __wbg_graphcursor_free: (a: number, b: number) => void;
    readonly graphcursor_kind: (a: number, b: number) => void;
    readonly graphcursor_page: (a: number, b: number, c: number, d: number) => void;
    readonly graphcursor_next: (a: number, b: number) => void;
    readonly graphcursor_close: (a: number) => void;
    readonly graphcursor_closed: (a: number) => number;
    readonly version: (a: number) => void;
    readonly rust_zstd_wasm_shim_qsort: (a: number, b: number, c: number, d: number) => void;
    readonly rust_zstd_wasm_shim_malloc: (a: number) => number;
    readonly rust_zstd_wasm_shim_memcmp: (a: number, b: number, c: number) => number;
    readonly rust_zstd_wasm_shim_calloc: (a: number, b: number) => number;
    readonly rust_zstd_wasm_shim_free: (a: number) => void;
    readonly rust_zstd_wasm_shim_memcpy: (a: number, b: number, c: number) => number;
    readonly rust_zstd_wasm_shim_memmove: (a: number, b: number, c: number) => number;
    readonly rust_zstd_wasm_shim_memset: (a: number, b: number, c: number) => number;
    readonly __wbg_repository_free: (a: number, b: number) => void;
    readonly __wbg_graph_free: (a: number, b: number) => void;
    readonly cstx_graph: (a: number) => number;
    readonly cstx_repository: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
