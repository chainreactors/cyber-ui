import React, {useState, useCallback, useMemo} from 'react';
import {Zap, Circle, Target, LayoutGrid, GitBranch} from 'lucide-react';
import SigmaGraph from './SigmaGraph';

interface GraphNode {
    id: string;
    type?: string;
    [key: string]: unknown;
}

interface GraphEdge {
    source?: string;
    target?: string;
    type?: string;
    [key: string]: unknown;
}

interface LayoutConfig {
    type: string;
    icon?: React.ElementType<{ className?: string }>;
    name?: string;
    description?: string;
    settings?: Record<string, unknown>;
    levelHeight?: number;
    nodeSpacing?: number;
    layerOrder?: string[];
}

interface FieldMapping {
    edgeSource?: string;
    edgeTarget?: string;
    nodeType?: string;
    nodeCategory?: string;
    hierarchicalLayerOrder?: string[];
    [key: string]: unknown;
}

interface GraphContainerProps {
    nodes?: GraphNode[];
    edges?: GraphEdge[];
    selectedNodeId?: string | null;
    highlightedNodeId?: string | null;
    focusNodeId?: string | null;
    onNodeClick?: (nodeData: GraphNode | null, nodeId: string) => void;
    onNodeDoubleClick?: (nodeData: GraphNode | null, nodeId: string) => void;
    onNodeRightClick?: (nodeData: GraphNode | null, nodeId: string, event?: MouseEvent) => void;
    onNodeHover?: (nodeData: GraphNode | null, nodeId: string) => void;
    onNodeLeave?: (nodeId: string) => void;
    onEdgeClick?: (edgeData: GraphEdge | null, edgeId: string) => void;
    onEdgeDoubleClick?: (edgeData: GraphEdge | null, edgeId: string, sourceNode?: GraphNode | null, targetNode?: GraphNode | null) => void;
    layoutType?: string;
    className?: string;
    height?: string;
    matchingNodeIds?: Set<string>;
    layoutConfigs?: Record<string, LayoutConfig>;
    handleLayoutChange?: (type: string) => void;
    loading?: boolean;
    typeColorMap?: Record<string, string>;
    relationshipColorMap?: Record<string, string>;
    fieldMapping?: FieldMapping;
}

/**
 * GraphContainer - Clean implementation based on demo Root.tsx
 */
const GraphContainer = ({
                            nodes = [],
                            edges = [],
                            selectedNodeId,
                            highlightedNodeId,
                            focusNodeId,
                            onNodeClick,
                            onNodeDoubleClick,
                            onNodeRightClick,
                            onNodeHover,
                            onNodeLeave,
                            onEdgeClick,
                            onEdgeDoubleClick,
                            layoutType = 'force',
                            className = "",
                            height = "400px",
                            matchingNodeIds = new Set(),
                            // 简化的布局控制
                            layoutConfigs = {
                                circular: {type: 'circular', icon: Circle, name: '环形布局'},
                                force: {type: 'force', icon: Zap, name: '力导向布局'},
                                hierarchical: {type: 'hierarchical', icon: GitBranch, name: '分层布局'},
                                electron: {type: 'electron', icon: Target, name: '电子层级'},
                                grid: {type: 'grid', icon: LayoutGrid, name: '网格布局'}
                            },
                            handleLayoutChange = () => {
                            },
                            loading = false,
                            typeColorMap = {}, // 新增：类型颜色映射
                            relationshipColorMap = {}, // 新增：关系类型颜色映射
                            // 字段映射配置
                            fieldMapping = {
                                edgeSource: 'source', // 边源字段
                                edgeTarget: 'target', // 边目标字段
                                nodeType: 'type', // 节点类型字段
                                hierarchicalLayerOrder: [] // 分层布局层级顺序
                            }
                        }: GraphContainerProps) => {
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const toGraphNode = useCallback((value: unknown): GraphNode | null => {
        return value && typeof value === 'object' ? value as GraphNode : null;
    }, []);

    const toGraphEdge = useCallback((value: unknown): GraphEdge | null => {
        return value && typeof value === 'object' ? value as GraphEdge : null;
    }, []);

    // Node color mapper
    const nodeColorMapper = useCallback((node: GraphNode) => {
        const nodeType = typeof node.type === 'string' ? node.type : null;
        return nodeType ? (typeColorMap[nodeType] ?? '#6b7280') : '#6b7280';
    }, [typeColorMap]);

    // Node size mapper - based on edge count
    const nodeSizeMapper = useCallback((node: GraphNode) => {
        const nodeId = node.id;
        const edgeSourceKey = fieldMapping.edgeSource ?? 'source';
        const edgeTargetKey = fieldMapping.edgeTarget ?? 'target';

        // 计算该节点的关联边数量
        const edgeCount = edges.filter(edge => {
            const sourceId = edge[edgeSourceKey];
            const targetId = edge[edgeTargetKey];
            return sourceId === nodeId || targetId === nodeId;
        }).length;

        const baseSize = 5;
        const dynamicSize = Math.log2(edgeCount + 1) * 1.5;
        const finalSize = baseSize + dynamicSize;

        return Math.max(4, Math.min(20, Math.floor(finalSize)));
    }, [edges, fieldMapping.edgeSource, fieldMapping.edgeTarget]);

    // Layout options
    const layoutOptions = useMemo(() => {
        const defaultConfigs = {
            circular: {type: 'circular'},
            force: {
                type: 'force',
                settings: {
                    gravity: 1,
                    scalingRatio: 10,
                    strongGravityMode: false,
                    outboundAttractionDistribution: false
                }
            },
            hierarchical: {
                type: 'hierarchical',
                layerOrder: fieldMapping.hierarchicalLayerOrder ?? [],
                nodeTypeField: fieldMapping.nodeType ?? 'type',
                nodeSpacing: 80,
                layerGap: 150,
                rowGap: 70
            },
            electron: {
                type: 'electron',
                minNodeSpacing: 30,
                minRingGap: 60
            },
            grid: {
                type: 'grid',
                cellWidth: 40,
                rowHeight: 100
            }
        } as const;

        const defaultConfig = layoutType in defaultConfigs
            ? defaultConfigs[layoutType as keyof typeof defaultConfigs]
            : defaultConfigs.circular;
        const activeConfig = layoutConfigs[layoutType] ?? defaultConfig;

        return {
            ...activeConfig,
            type: activeConfig.type ?? layoutType,
            ...(layoutType === 'hierarchical'
                ? {
                    layerOrder: fieldMapping.hierarchicalLayerOrder ?? [],
                    nodeTypeField: fieldMapping.nodeType ?? 'type',
                }
                : {})
        };
    }, [layoutType, layoutConfigs, fieldMapping.hierarchicalLayerOrder, fieldMapping.nodeType]);

    // Only handle hover state for visual feedback - other events pass through directly
    const handleNodeClick = useCallback((nodeData: unknown, nodeId: string) => {
        onNodeClick?.(toGraphNode(nodeData), nodeId);
    }, [onNodeClick, toGraphNode]);

    const handleNodeDoubleClick = useCallback((nodeData: unknown, nodeId: string) => {
        onNodeDoubleClick?.(toGraphNode(nodeData), nodeId);
    }, [onNodeDoubleClick, toGraphNode]);

    const handleNodeRightClick = useCallback((nodeData: unknown, nodeId: string, event: MouseEvent) => {
        onNodeRightClick?.(toGraphNode(nodeData), nodeId, event);
    }, [onNodeRightClick, toGraphNode]);

    const handleNodeHover = useCallback((nodeData: unknown, nodeId: string) => {
        setHoveredNode(nodeId);
        onNodeHover?.(toGraphNode(nodeData), nodeId);
    }, [onNodeHover, toGraphNode]);

    const handleNodeLeave = useCallback((nodeId: string) => {
        setHoveredNode(null);
        onNodeLeave?.(nodeId);
    }, [onNodeLeave]);

    const handleEdgeClick = useCallback((edgeData: unknown, edgeId: string) => {
        onEdgeClick?.(toGraphEdge(edgeData), edgeId);
    }, [onEdgeClick, toGraphEdge]);

    const handleEdgeDoubleClick = useCallback((
        edgeData: unknown,
        edgeId: string,
        sourceNode?: unknown,
        targetNode?: unknown
    ) => {
        onEdgeDoubleClick?.(
            toGraphEdge(edgeData),
            edgeId,
            toGraphNode(sourceNode),
            toGraphNode(targetNode)
        );
    }, [onEdgeDoubleClick, toGraphEdge, toGraphNode]);


    return (
        <div className={`relative ${className}`} style={{height}}>
            {/* Main graph */}
            <SigmaGraph
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                hoveredNodeId={hoveredNode}
                highlightedNodeId={highlightedNodeId}
                focusNodeId={focusNodeId}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onNodeRightClick={handleNodeRightClick}
                onNodeHover={handleNodeHover}
                onNodeLeave={handleNodeLeave}
                onEdgeClick={handleEdgeClick}
                onEdgeDoubleClick={handleEdgeDoubleClick}
                nodeColorMapper={nodeColorMapper}
                nodeSizeMapper={nodeSizeMapper}
                layoutOptions={layoutOptions}
                className="w-full"
                height={height}
                matchingNodeIds={matchingNodeIds} // 传递匹配节点ID用于过滤高亮
                relationshipColorMap={relationshipColorMap} // 传递关系颜色映射
                fieldMapping={fieldMapping} // 传递字段映射配置
            />

        </div>
    );
};

export default GraphContainer;
