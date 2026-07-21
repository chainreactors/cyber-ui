import { type ComponentType, useMemo } from 'react'
import * as dagre from 'dagre'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge as FlowEdge,
  type Node as FlowNode,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ForumThread } from '../types'
import { detectContentType } from '../types'
import { resolveRenderer } from './content-registry'
import { cn } from '@cyber/theme'
import { Badge, Button, EmptyState } from '@cyber/ui'
import { GitBranch, Inbox, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { messageRefIds, messageTitle, shortId, contentBody } from './forum-utils'

// -- Graph node data --

type GraphNodeData = {
  messageId: string
  title: string
  kind: string
  meta: string
  refCount: number
  active: boolean
}

type GraphFlowNode = FlowNode<GraphNodeData>
type GraphFlowEdge = FlowEdge<{ kind: 'refs.messages' }>

// -- Node card --

function GraphNodeCard({ data, selected }: NodeProps<GraphFlowNode>) {
  return (
    <div className={cn(
      'w-[240px] overflow-hidden rounded-lg border bg-card px-2.5 py-2 text-left shadow-sm transition-colors',
      data.active || selected ? 'border-primary/55 ring-2 ring-primary/15' : 'border-border',
    )}>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-primary !bg-background" />
      <div className="flex min-w-0 items-center gap-1.5">
        <Badge
          variant={resolveRenderer(data.kind).badgeVariant}
          className="shrink-0 rounded-md px-1.5 py-px text-[9px]"
        >
          {data.kind}
        </Badge>
        {data.refCount > 0 && (
          <span className="shrink-0 rounded border border-border/70 bg-muted px-1.5 py-px text-[9px] text-muted-foreground">
            {data.refCount} refs
          </span>
        )}
      </div>
      <div className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug text-foreground">{data.title}</div>
      {data.meta && <div className="mt-1 truncate text-[10px] text-muted-foreground">{data.meta}</div>}
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-primary !bg-background" />
    </div>
  )
}

const GRAPH_NODE_TYPES: NodeTypes = {
  threadMessage: GraphNodeCard as ComponentType<NodeProps>,
}

// -- Layout builder --

interface GraphEdgeMeta {
  id: string
  source: string
  target: string
}

function buildGraphFlow(
  thread: ForumThread,
  selectedMessageId: string,
): { nodes: GraphFlowNode[]; edges: GraphFlowEdge[]; edgeCount: number; externalRefCount: number } {
  const messageIds = new Set(thread.messages.map(m => m.id!))
  const graphEdges: GraphEdgeMeta[] = []
  let externalRefCount = 0

  for (const message of thread.messages) {
    for (const refId of messageRefIds(message)) {
      if (messageIds.has(refId)) {
        graphEdges.push({
          id: `${message.id}__${refId}`,
          source: refId,
          target: message.id!,
        })
      } else {
        externalRefCount++
      }
    }
  }

  const graph = new dagre.graphlib.Graph<{ width: number; height: number }>()
  graph.setGraph({
    rankdir: 'TB',
    align: 'UL',
    nodesep: 24,
    ranksep: 48,
    marginx: 16,
    marginy: 16,
  })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const message of thread.messages) {
    graph.setNode(message.id!, { width: 260, height: 86 })
  }
  for (const edge of graphEdges) {
    graph.setEdge(edge.source, edge.target)
  }
  dagre.layout(graph)

  const rawNodes = graph.nodes().map(id => {
    const node = graph.node(id)
    return {
      id,
      x: node.x - node.width / 2,
      y: node.y - node.height / 2,
      width: node.width,
      height: node.height,
    }
  })
  const minX = Math.min(...rawNodes.map(n => n.x), 0)
  const minY = Math.min(...rawNodes.map(n => n.y), 0)
  const shiftX = minX < 12 ? 12 - minX : 0
  const shiftY = minY < 12 ? 12 - minY : 0

  const messageById = new Map(thread.messages.map(m => [m.id!, m]))
  const flowNodes: GraphFlowNode[] = rawNodes.map(n => {
    const message = messageById.get(n.id)
    const active = n.id === selectedMessageId
    const ct = message ? detectContentType(message.content, message.content_type) : 'unknown'
    const content = message?.content as Record<string, unknown> | undefined
    const title = (content ? messageTitle(content) : '') || (content ? contentBody(content).split(/\r?\n/).map(l => l.trim()).find(Boolean) || '' : '') || shortId(n.id)
    return {
      id: n.id,
      type: 'threadMessage',
      position: { x: n.x + shiftX, y: n.y + shiftY },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      selected: active,
      draggable: false,
      data: {
        messageId: n.id,
        title,
        kind: ct,
        meta: message?.sender ? shortId(message.sender) : '',
        refCount: message ? messageRefIds(message).length : 0,
        active,
      },
    }
  })

  const flowEdges: GraphFlowEdge[] = graphEdges.map(edge => {
    const active = Boolean(selectedMessageId && (edge.source === selectedMessageId || edge.target === selectedMessageId))
    const stroke = active ? 'hsl(var(--primary))' : 'hsl(var(--border))'
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: active,
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
      style: { stroke, strokeWidth: active ? 2.2 : 1.4 },
      data: { kind: 'refs.messages' as const },
    }
  })

  return { nodes: flowNodes, edges: flowEdges, edgeCount: graphEdges.length, externalRefCount }
}

// -- Graph panel --

export interface GraphPanelProps {
  thread: ForumThread
  selectedMessageId: string
  onSelectMessage: (messageId: string) => void
  mode: 'side' | 'dialog'
  title?: string
  onCollapse?: () => void
}

export function GraphPanel({
  thread,
  selectedMessageId,
  onSelectMessage,
  mode,
  title = 'Message Graph',
  onCollapse,
}: GraphPanelProps) {
  const layout = useMemo(
    () => buildGraphFlow(thread, selectedMessageId),
    [selectedMessageId, thread],
  )

  return (
    <div className={cn(
      'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card',
      mode === 'side' ? 'h-full' : 'h-full',
    )}>
      <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-border bg-muted/20 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-foreground">{title}</div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {thread.messageCount} messages · {layout.edgeCount} refs
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className="max-w-[140px] truncate rounded-md px-1.5 py-px text-[10px]">
            {thread.spaceName}
          </Badge>
          {mode === 'side' && onCollapse && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7"
              title="Collapse graph"
              onClick={onCollapse}
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className={cn('min-h-0 flex-1', mode === 'side' ? 'h-[420px]' : 'h-full')}>
        {layout.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState icon={Inbox} title={`No ${title} messages`} compact />
          </div>
        ) : (
          <ReactFlow
            key={`${thread.id}:${layout.nodes.length}:${layout.edges.length}`}
            nodes={layout.nodes}
            edges={layout.edges}
            nodeTypes={GRAPH_NODE_TYPES}
            fitView
            fitViewOptions={{ padding: mode === 'dialog' ? 0.1 : 0.18 }}
            minZoom={0.35}
            maxZoom={1.6}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            onNodeClick={(_, node) => onSelectMessage(String(node.data.messageId))}
          >
            <Background gap={20} size={1} color="hsl(var(--border))" />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-5 bg-primary" />
          refs.messages
        </span>
        {layout.externalRefCount > 0 && <span>{layout.externalRefCount} external refs</span>}
      </div>
    </div>
  )
}

// -- Collapsed button --

export interface CollapsedGraphButtonProps {
  thread: ForumThread
  onExpand: () => void
}

export function CollapsedGraphButton({ thread, onExpand }: CollapsedGraphButtonProps) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        className="h-9 w-9 rounded-lg bg-card"
        title="Expand message graph"
        onClick={onExpand}
      >
        <PanelRightOpen className="h-4 w-4" />
      </Button>
      <div className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-border bg-card px-1.5 py-2 text-[10px] text-muted-foreground">
        <GitBranch className="h-3.5 w-3.5 shrink-0" />
        <span className="[writing-mode:vertical-rl]">Message Graph</span>
        <span className="mt-1 rounded border border-border/70 bg-muted px-1 py-0.5">{thread.messageCount}</span>
      </div>
    </div>
  )
}
