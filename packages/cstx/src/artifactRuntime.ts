import initWasm, { CSTX, version, type InitInput } from './wasm/cstx_wasm.js'

export interface ArtifactInput {
  artifact: string
  producer?: string
  data: Uint8Array
}

export interface CanonicalSCONode {
  cstx_id: string
  cstx_type: string
  [field: string]: unknown
}

export interface ArtifactResult {
  artifact: string
  recordsParsed: number
  nodes: CanonicalSCONode[]
}

interface DynamicNode {
  id: string
  type: string
  model: Record<string, unknown>
}

interface ParseResult {
  nodes: DynamicNode[]
  relationships: Record<string, unknown>[]
  recordsParsed: number
}

interface ExtensionInfo {
  name: string
  enabled: boolean
  artifacts?: string[]
}

/** Browser-owned artifact normalizer backed by the versioned CSTX WASM ABI. */
export class CSTXArtifactNormalizer {
  private constructor(
    private readonly runtime: CSTX,
    readonly abiVersion: string,
  ) {}

  static async create(module?: InitInput | Promise<InitInput>): Promise<CSTXArtifactNormalizer> {
    await initWasm(module)
    const abiVersion = version().trim()
    if (!abiVersion) {
      throw new Error('CSTX WASM ABI did not report a version')
    }
    const runtime = new CSTX()
    for (const extension of extensionCatalog(runtime)) {
      if (!extension.enabled && extension.name && (extension.artifacts?.length ?? 0) > 0) {
        runtime.extensions.enable(extension.name)
      }
    }
    return new CSTXArtifactNormalizer(runtime, abiVersion)
  }

  supportedArtifacts(): string[] {
    return [...new Set(extensionCatalog(this.runtime)
      .filter((extension) => extension.enabled)
      .flatMap((extension) => extension.artifacts ?? []))].sort()
  }

  /** Seed the runtime graph from canonical nodes already persisted by the host. */
  hydrate(nodes: readonly CanonicalSCONode[]): void {
    if (nodes.length === 0) return
    this.runtime.graph.addNodes(nodes.map(unflattenNode))
  }

  normalize(input: ArtifactInput): ArtifactResult {
    const producer = input.producer?.trim() || input.artifact.trim()
    const artifact = input.artifact.trim() || producer
    if (!producer) throw new Error('artifact producer is required')
    if (!artifact) throw new Error('artifact type is required')
    if (!this.runtime.extensions.parsesArtifact(artifact)) {
      throw new Error(`unsupported CSTX artifact: ${artifact}`)
    }

    const parsed = fromWasm<ParseResult>(
      this.runtime.graph.parse('', artifact, input.data),
    )
    this.runtime.graph.addNodes(parsed.nodes)
    if (parsed.relationships.length > 0) {
      this.runtime.graph.addRelationships(parsed.relationships)
    }

    const ids = [...new Set(parsed.nodes.map((node) => node.id).filter(Boolean))]
    if (ids.length > 0) this.runtime.graph.link(ids, producer)
    const nodes = ids.map((id) => flattenNode(fromWasm<DynamicNode>(this.runtime.graph.node(id))))
    return {
      artifact,
      recordsParsed: parsed.recordsParsed,
      nodes,
    }
  }

  close(): void {
    if (!this.runtime.closed) this.runtime.close()
    this.runtime.free()
  }
}

function extensionCatalog(runtime: CSTX): ExtensionInfo[] {
  return fromWasm<ExtensionInfo[]>(runtime.extensions.list())
}

function flattenNode(node: DynamicNode): CanonicalSCONode {
  return { ...node.model, cstx_id: node.id, cstx_type: node.type }
}

function unflattenNode(node: CanonicalSCONode): DynamicNode {
  const { cstx_id, cstx_type, ...model } = node
  if (!cstx_id || !cstx_type) throw new Error('canonical CSTX node requires cstx_id and cstx_type')
  return { id: cstx_id, type: cstx_type, model }
}

function fromWasm<T>(value: unknown): T {
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value.entries()].map(([key, item]) => [String(key), fromWasm(item)]),
    ) as T
  }
  if (Array.isArray(value)) return value.map((item) => fromWasm(item)) as T
  if (value != null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, fromWasm(item)]),
    ) as T
  }
  return value as T
}
