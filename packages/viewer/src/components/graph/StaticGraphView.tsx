import { useState, useEffect, useMemo, useCallback, type CSSProperties } from 'react'
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
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { X } from 'lucide-react'
import { useResolvedTheme } from '../../lib/use-resolved-theme'
import { layoutDAG } from '../../lib/graph-layout'
import StaticAPGNode from './StaticAPGNode'
import { SelfLoopEdge, BackEdge } from './SelfLoopEdge'
import PromptContent from '../shared/PromptContent'

interface GraphEdge {
  to?: string
  to_node?: string
  condition: string
}

interface GraphNode {
  id: string
  name: string
  type: string
  prompt: string
  input?: Record<string, string> | null
  output?: Record<string, string> | null
  example?: string[]
  edges: GraphEdge[]
}

interface GraphData {
  name?: string
  nodes: GraphNode[]
}

const nodeTypes: NodeTypes = {
  staticNode: StaticAPGNode,
}

const edgeTypes: EdgeTypes = {
  selfLoop: SelfLoopEdge,
  backEdge: BackEdge,
}

export interface StaticGraphViewProps {
  graph?: GraphData | null
  fetchUrl?: string
  isDark?: boolean
  onNodeClick?: (node: GraphNode) => void
  renderDetailPanel?: (node: GraphNode, onClose: () => void) => React.ReactNode
}

export default function StaticGraphView({
  graph: graphProp,
  fetchUrl = '/api/graph',
  isDark: isDarkProp,
  onNodeClick: onNodeClickProp,
  renderDetailPanel,
}: StaticGraphViewProps) {
  const [fetchedGraph, setFetchedGraph] = useState<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const isDark = useResolvedTheme(isDarkProp)

  const graph = graphProp !== undefined ? graphProp : fetchedGraph

  useEffect(() => {
    if (graphProp !== undefined) return
    fetch(fetchUrl)
      .then((r) => r.json())
      .then((data) => setFetchedGraph(data))
      .catch(() => {})
  }, [graphProp, fetchUrl])

  // Compute layout when graph data changes
  useEffect(() => {
    if (!graph?.nodes?.length) {
      setNodes([])
      setEdges([])
      return
    }

    // Collect edges for layout
    const layoutEdges: { source: string; target: string }[] = []
    const rfEdges: Edge[] = []
    for (const n of graph.nodes) {
      for (const e of n.edges) {
        const target = e.to ?? e.to_node ?? ''
        const isSelfLoop = n.id === target
        if (!isSelfLoop) {
          layoutEdges.push({ source: n.id, target })
        }
        rfEdges.push({
          id: `se-${n.id}-${target}`,
          source: n.id,
          target,
          type: isSelfLoop ? 'selfLoop' : 'smoothstep',
          animated: true,
          label: e.condition,
          labelStyle: {
            fill: isDark ? '#9ca3af' : '#6b7280',
            fontSize: 11,
            fontWeight: 500,
          },
          labelBgStyle: {
            fill: isDark ? '#111827' : '#f9fafb',
            fillOpacity: 0.85,
            rx: 4,
            ry: 4,
          },
          labelBgPadding: [6, 4] as [number, number],
          style: {
            stroke: isSelfLoop
              ? (isDark ? '#8b5cf6' : '#7c3aed')
              : (isDark ? '#4b5563' : '#d1d5db'),
            strokeWidth: 2,
          },
        })
      }
    }

    // Run DAG layout
    const positions = layoutDAG(
      graph.nodes.map((n) => ({ id: n.id, width: 200, height: 60 })),
      layoutEdges,
    )

    const rfNodes: Node[] = graph.nodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 }
      return {
        id: n.id,
        type: 'staticNode',
        position: pos,
        data: { label: n.name, nodeType: n.type, nodeId: n.id },
      }
    })

    setNodes(rfNodes)
    setEdges(rfEdges)
  }, [graph, isDark, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const gn = graph?.nodes.find((n) => n.id === node.id) ?? null
      setSelectedNode(gn)
      if (gn) onNodeClickProp?.(gn)
    },
    [graph, onNodeClickProp],
  )

  const defaultViewport = useMemo(() => ({ x: 20, y: 20, zoom: 0.9 }), [])

  if (!graph) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#6b7280' }}>
        Loading graph definition...
      </div>
    )
  }

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={defaultViewport}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        onNodeClick={onNodeClick}
      >
        <Background color={isDark ? '#1f2937' : '#e5e7eb'} gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {selectedNode && (
        renderDetailPanel
          ? renderDetailPanel(selectedNode, () => setSelectedNode(null))
          : <StaticNodeDetail
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
      )}
    </div>
  )
}

/* ---------- inline detail panel ---------- */

const badgeColors: Record<string, { dark: { bg: string; text: string }; light: { bg: string; text: string } }> = {
  intention:  { dark: { bg: 'rgba(88,28,135,0.6)', text: '#d8b4fe' }, light: { bg: '#f3e8ff', text: '#7c3aed' } },
  action:     { dark: { bg: 'rgba(30,58,138,0.6)', text: '#93c5fd' }, light: { bg: '#dbeafe', text: '#2563eb' } },
  evaluation: { dark: { bg: 'rgba(120,53,15,0.6)', text: '#fcd34d' }, light: { bg: '#fef3c7', text: '#d97706' } },
  result:     { dark: { bg: 'rgba(22,101,52,0.6)', text: '#86efac' }, light: { bg: '#dcfce7', text: '#16a34a' } },
}

function StaticNodeDetail({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const isDark = useResolvedTheme()
  const bc = badgeColors[node.type] ?? badgeColors.action
  const b = isDark ? bc.dark : bc.light

  const panelStyle: CSSProperties = {
    position: 'absolute', right: 0, top: 0, height: '100%', width: 320,
    backdropFilter: 'blur(8px)', zIndex: 50,
    display: 'flex', flexDirection: 'column',
    borderLeft: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    background: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
  }

  return (
    <div style={panelStyle}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isDark ? '#f3f4f6' : '#1f2937' }}>
            {node.name}
          </span>
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, flexShrink: 0, background: b.bg, color: b.text }}>
            {node.type}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af' }}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* id */}
      <div style={{ padding: '6px 16px', borderBottom: `1px solid ${isDark ? 'rgba(31,41,55,0.6)' : '#e5e7eb'}`, fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>
        id: {node.id}
      </div>

      {/* content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 12, color: isDark ? '#d1d5db' : '#4b5563' }}>
        {/* prompt */}
        <PromptContent content={node.prompt} />

        {/* input schema */}
        {node.input && Object.keys(node.input).length > 0 && (
          <SchemaSection label="Input" color="amber" schema={node.input} />
        )}

        {/* output schema */}
        {node.output && Object.keys(node.output).length > 0 && (
          <SchemaSection label="Output" color="cyan" schema={node.output} />
        )}

        {/* examples */}
        {node.example && node.example.length > 0 && (
          <div style={{ borderRadius: 4, border: `1px solid ${isDark ? 'rgba(113,63,18,0.4)' : '#fde68a'}`, overflow: 'hidden' }}>
            <div style={{ padding: '4px 8px', borderBottom: `1px solid ${isDark ? 'rgba(31,41,55,0.3)' : '#fde68a'}`, background: isDark ? 'rgba(31,41,55,0.4)' : '#fefce8' }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: isDark ? '#facc15' : '#ca8a04' }}>Examples</span>
            </div>
            <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {node.example.map((ex, i) => (
                <pre key={i} style={{ whiteSpace: 'pre-wrap', fontSize: 11, fontFamily: 'monospace', borderRadius: 4, padding: '4px 8px', margin: 0, color: isDark ? '#d1d5db' : '#4b5563', background: isDark ? 'rgba(31,41,55,0.3)' : '#f3f4f6' }}>
                  {ex}
                </pre>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* edges */}
      {node.edges.length > 0 && (
        <div style={{ borderTop: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`, padding: '8px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Edges
          </div>
          {node.edges.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '2px 0' }}>
              <span style={{ color: '#6b7280' }}>&rarr;</span>
              <span style={{ fontFamily: 'monospace', color: isDark ? '#93c5fd' : '#2563eb' }}>{e.to ?? e.to_node}</span>
              <span style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.condition}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- JSON Schema → Pydantic model code ---------- */

function SchemaSection({ label, color, schema }: {
  label: string
  color: string
  schema: Record<string, string>
}) {
  const isDark = useResolvedTheme()
  const borderClr = isDark
    ? (color === 'amber' ? 'rgba(120,53,15,0.4)' : 'rgba(22,78,99,0.4)')
    : (color === 'amber' ? '#fde68a' : '#a5f3fc')
  const labelClr = isDark
    ? (color === 'amber' ? '#fbbf24' : '#22d3ee')
    : (color === 'amber' ? '#d97706' : '#0891b2')
  const hlStyle = isDark ? oneDark : oneLight
  const code = schemaToPydanticCode(label, schema)

  return (
    <div style={{ borderRadius: 4, border: `1px solid ${borderClr}`, overflow: 'hidden' }}>
      <div style={{ padding: '4px 8px', borderBottom: `1px solid ${isDark ? 'rgba(31,41,55,0.3)' : '#e5e7eb'}`, background: isDark ? 'rgba(31,41,55,0.4)' : '#f9fafb' }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: labelClr }}>
          {label} Schema
        </span>
      </div>
      <SyntaxHighlighter
        language="python"
        style={hlStyle}
        customStyle={{ margin: 0, padding: '0.5rem', fontSize: '0.7rem', background: 'transparent', borderRadius: 0 }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

function schemaToPydanticCode(label: string, schema: Record<string, string>): string {
  const lines = [`class ${label}Model(BaseModel):`]
  for (const [field, typeName] of Object.entries(schema)) {
    lines.push(`    ${field}: ${typeName}`)
  }
  return lines.join('\n')
}
