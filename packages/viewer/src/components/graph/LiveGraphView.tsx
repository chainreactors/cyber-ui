// LEGACY APG tier: no in-repo consumers and no Go producer — AOP
// (lib/aop-reducer.ts) is the only live message implementation.
// Kept intact pending a consumer-side refactor to AOP.

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useGraphState } from '../../providers/useGraphState'
import { useResolvedTheme } from '../../lib/use-resolved-theme'
import { layoutDAG } from '../../lib/graph-layout'
import type { APGNodeData } from '../../lib/event-reducer'
import LiveAPGNode from './LiveAPGNode'
import { SelfLoopEdge, BackEdge } from './SelfLoopEdge'
import NodeDetailPanel from './NodeDetailPanel'

export interface LiveGraphViewProps {
  nodes: Node<APGNodeData>[]
  edges: Edge[]
  isDark?: boolean
  renderDetailPanel?: (node: APGNodeData, onClose: () => void) => React.ReactNode
  onNodeClick?: (nodeId: string, data: APGNodeData) => void
  defaultViewport?: { x: number; y: number; zoom: number }
}

const defaultNodeTypes: NodeTypes = {
  apgNode: LiveAPGNode,
}

const defaultEdgeTypes: EdgeTypes = {
  selfLoop: SelfLoopEdge,
  backEdge: BackEdge,
}

export default function LiveGraphView({
  nodes: nodesProp,
  edges: edgesProp,
  isDark: isDarkProp,
  renderDetailPanel,
  onNodeClick: onNodeClickProp,
  defaultViewport: defaultViewportProp,
}: LiveGraphViewProps) {
  const isDark = useResolvedTheme(isDarkProp)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Sync props into controlled state with auto-layout
  useEffect(() => {
    // Compute DAG layout positions from the incoming nodes/edges
    const positions = layoutDAG(
      nodesProp.map((n) => ({ id: n.id, width: 200, height: 60 })),
      edgesProp.map((e) => ({ source: e.source, target: e.target })),
    )

    setNodes((prev) => {
      // Preserve drag positions for nodes that already exist
      const dragMap = new Map(prev.map((n) => [n.id, n.position]))
      return nodesProp.map((n) => ({
        ...n,
        position: dragMap.get(n.id) ?? positions.get(n.id) ?? n.position,
      }))
    })
    setEdges(edgesProp)
  }, [nodesProp, edgesProp, setNodes, setEdges])

  // Always look up the latest node data so prompt/output updates are reflected
  const selected = useMemo(() => {
    if (!selectedId) return null
    const n = nodes.find((n) => n.id === selectedId)
    return n ? (n.data as APGNodeData) : null
  }, [selectedId, nodes])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedId(node.id)
      const data = node.data as APGNodeData
      onNodeClickProp?.(node.id, data)
    },
    [onNodeClickProp],
  )

  const defaultViewport = useMemo(
    () => defaultViewportProp ?? { x: 40, y: 20, zoom: 0.85 },
    [defaultViewportProp],
  )

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={defaultNodeTypes}
        edgeTypes={defaultEdgeTypes}
        onNodeClick={onNodeClick}
        defaultViewport={defaultViewport}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color={isDark ? '#1f2937' : '#e5e7eb'} gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {selected && (
        renderDetailPanel
          ? renderDetailPanel(selected, () => setSelectedId(null))
          : <NodeDetailPanel
              node={selected}
              onClose={() => setSelectedId(null)}
              isDark={isDarkProp}
            />
      )}
    </div>
  )
}

/** Connected wrapper — pulls data from useGraphState() hook (requires APGWebSocketProvider). */
export function ConnectedGraphView(props: Omit<LiveGraphViewProps, 'nodes' | 'edges'>) {
  const { nodes, edges } = useGraphState()
  return <LiveGraphView nodes={nodes} edges={edges} {...props} />
}
