/**
 * Cycle-aware layered graph layout.
 *
 * Handles directed graphs with cycles (self-loops, back-edges) using a
 * modified Sugiyama approach:
 *
 *   1. Detect back-edges via DFS and temporarily reverse them
 *   2. Assign layers using longest-path from roots
 *   3. Barycenter ordering to reduce crossings
 *   4. Position nodes in a grid
 *
 * Back-edges and self-loops are ignored during layout — they are rendered
 * as curved paths by custom edge components (@xyflow/react).
 *
 * Exported API is backward-compatible: `layoutDAG` is an alias for `layoutGraph`.
 */

interface LayoutNode {
  id: string
  width: number
  height: number
}

interface LayoutEdge {
  source: string
  target: string
}

interface Position {
  x: number
  y: number
}

export interface LayoutOptions {
  nodeWidth?: number
  nodeHeight?: number
  horizontalGap?: number
  verticalGap?: number
  direction?: 'TB' | 'LR'
}

const DEFAULT_NODE_WIDTH = 200
const DEFAULT_NODE_HEIGHT = 60
const HORIZONTAL_GAP = 80
const VERTICAL_GAP = 100

/**
 * Compute positions for a directed graph (may contain cycles).
 * Returns a map of nodeId → { x, y }.
 */
export function layoutGraph(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options?: LayoutOptions,
): Map<string, Position> {
  const nodeWidth = options?.nodeWidth ?? DEFAULT_NODE_WIDTH
  const nodeHeight = options?.nodeHeight ?? DEFAULT_NODE_HEIGHT
  const hGap = options?.horizontalGap ?? HORIZONTAL_GAP
  const vGap = options?.verticalGap ?? VERTICAL_GAP
  const direction = options?.direction ?? 'TB'

  if (nodes.length === 0) return new Map()

  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const nodeSet = new Set(nodes.map((n) => n.id))

  // ── 1. Filter edges, detect back-edges ──────────────────────────

  const forwardEdges = filterAndBreakCycles(nodes, edges, nodeSet)

  // ── 2. Build adjacency from forward-only edges ──────────────────

  const children = new Map<string, string[]>()
  const parents = new Map<string, string[]>()

  for (const n of nodes) {
    children.set(n.id, [])
    parents.set(n.id, [])
  }

  for (const e of forwardEdges) {
    children.get(e.source)!.push(e.target)
    parents.get(e.target)!.push(e.source)
  }

  // ── 3. Assign layers ────────────────────────────────────────────

  const layers = assignLayers(nodes, children, parents)

  // ── 4. Group + order ────────────────────────────────────────────

  const layerGroups = new Map<number, string[]>()
  for (const [id, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, [])
    layerGroups.get(layer)!.push(id)
  }

  const maxLayer = Math.max(...layers.values(), 0)
  orderLayers(layerGroups, maxLayer, children, parents)

  // ── 5. Position ─────────────────────────────────────────────────

  const positions = new Map<string, Position>()

  const layerHeights = new Map<number, number>()
  for (let l = 0; l <= maxLayer; l++) {
    const group = layerGroups.get(l) ?? []
    const height = group.reduce(
      (maxH, id) => Math.max(maxH, nodeById.get(id)?.height ?? nodeHeight),
      0,
    )
    layerHeights.set(l, height || nodeHeight)
  }

  let maxLayerWidth = 0
  for (let l = 0; l <= maxLayer; l++) {
    const group = layerGroups.get(l) ?? []
    const w = computeLayerWidth(group, nodeById, nodeWidth, hGap)
    if (w > maxLayerWidth) maxLayerWidth = w
  }

  let offsetY = 0

  for (let l = 0; l <= maxLayer; l++) {
    const group = layerGroups.get(l) ?? []
    const currentLayerWidth = computeLayerWidth(group, nodeById, nodeWidth, hGap)
    const offsetX = (maxLayerWidth - currentLayerWidth) / 2
    let cursorX = offsetX
    const currentLayerHeight = layerHeights.get(l) ?? nodeHeight

    for (const nodeId of group) {
      const currentNode = nodeById.get(nodeId)
      const currentNodeWidth = currentNode?.width ?? nodeWidth
      const currentNodeHeight = currentNode?.height ?? nodeHeight
      const x = cursorX
      const y = offsetY + (currentLayerHeight - currentNodeHeight) / 2

      if (direction === 'LR') {
        positions.set(nodeId, { x: y, y: x })
      } else {
        positions.set(nodeId, { x, y })
      }

      cursorX += currentNodeWidth + hGap
    }

    offsetY += currentLayerHeight + vGap
  }

  return positions
}

/** Backward-compatible alias. */
export const layoutDAG = layoutGraph

// ── Cycle breaking ────────────────────────────────────────────────

/**
 * Return the subset of edges that form a DAG by removing self-loops
 * and back-edges detected via DFS.
 */
function filterAndBreakCycles(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  nodeSet: Set<string>,
): LayoutEdge[] {
  // Build raw adjacency for DFS
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])

  const validEdges: LayoutEdge[] = []
  for (const e of edges) {
    if (e.source === e.target) continue              // self-loop
    if (!nodeSet.has(e.source) || !nodeSet.has(e.target)) continue
    adj.get(e.source)!.push(e.target)
    validEdges.push(e)
  }

  // DFS to classify edges as tree/forward/cross vs back
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>()
  for (const n of nodes) color.set(n.id, WHITE)

  const backEdges = new Set<string>()

  function dfs(u: string): void {
    color.set(u, GRAY)
    for (const v of adj.get(u) ?? []) {
      const vc = color.get(v)
      if (vc === GRAY) {
        // Back-edge: v is an ancestor of u in the DFS tree
        backEdges.add(`${u}\0${v}`)
      } else if (vc === WHITE) {
        dfs(v)
      }
    }
    color.set(u, BLACK)
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE) dfs(n.id)
  }

  // Return edges without back-edges
  return validEdges.filter((e) => !backEdges.has(`${e.source}\0${e.target}`))
}

// ── Layer assignment ──────────────────────────────────────────────

/** Assign layers using BFS from roots (acyclic graph after cycle breaking). */
function assignLayers(
  nodes: LayoutNode[],
  children: Map<string, string[]>,
  parents: Map<string, string[]>,
): Map<string, number> {
  const layers = new Map<string, number>()

  const roots = nodes.filter((n) => parents.get(n.id)!.length === 0)
  const seedNodes = roots.length > 0 ? roots : nodes.slice(0, 1)

  function walkFrom(startId: string, baseLayer: number): void {
    if (layers.has(startId)) return
    const queue: string[] = []
    layers.set(startId, baseLayer)
    queue.push(startId)

    let head = 0
    while (head < queue.length) {
      const id = queue[head++]
      const currentLayer = layers.get(id) ?? baseLayer

      for (const child of children.get(id) ?? []) {
        if (layers.has(child)) continue
        layers.set(child, currentLayer + 1)
        queue.push(child)
      }
    }
  }

  for (const node of seedNodes) {
    walkFrom(node.id, 0)
  }

  // Handle disconnected components
  for (const node of nodes) {
    if (layers.has(node.id)) continue
    const fallbackLayer = Math.max(...layers.values(), 0) + 1
    walkFrom(node.id, fallbackLayer)
  }

  return layers
}

// ── Layer ordering ────────────────────────────────────────────────

/** Barycenter heuristic to reduce edge crossings. */
function orderLayers(
  layerGroups: Map<number, string[]>,
  maxLayer: number,
  children: Map<string, string[]>,
  parents: Map<string, string[]>,
): void {
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 0) {
      for (let l = 1; l <= maxLayer; l++) {
        const group = layerGroups.get(l)
        if (!group || group.length <= 1) continue

        const prevGroup = layerGroups.get(l - 1) ?? []
        const prevIndex = new Map<string, number>()
        prevGroup.forEach((id, i) => prevIndex.set(id, i))

        group.sort((a, b) => {
          const aCenter = barycenter(parents.get(a) ?? [], prevIndex)
          const bCenter = barycenter(parents.get(b) ?? [], prevIndex)
          return aCenter - bCenter
        })
      }
    } else {
      for (let l = maxLayer - 1; l >= 0; l--) {
        const group = layerGroups.get(l)
        if (!group || group.length <= 1) continue

        const nextGroup = layerGroups.get(l + 1) ?? []
        const nextIndex = new Map<string, number>()
        nextGroup.forEach((id, i) => nextIndex.set(id, i))

        group.sort((a, b) => {
          const aCenter = barycenter(children.get(a) ?? [], nextIndex)
          const bCenter = barycenter(children.get(b) ?? [], nextIndex)
          return aCenter - bCenter
        })
      }
    }
  }
}

function barycenter(neighbors: string[], indexMap: Map<string, number>): number {
  if (neighbors.length === 0) return 0
  let sum = 0
  let count = 0
  for (const n of neighbors) {
    const idx = indexMap.get(n)
    if (idx !== undefined) {
      sum += idx
      count++
    }
  }
  return count > 0 ? sum / count : 0
}

// ── Helpers ───────────────────────────────────────────────────────

function computeLayerWidth(
  group: string[],
  nodeById: Map<string, LayoutNode>,
  defaultNodeWidth: number,
  horizontalGap: number,
): number {
  if (group.length === 0) return 0

  return group.reduce((width, id, index) => {
    const nodeWidth = nodeById.get(id)?.width ?? defaultNodeWidth
    return width + nodeWidth + (index > 0 ? horizontalGap : 0)
  }, 0)
}
