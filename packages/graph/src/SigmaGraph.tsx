import React, {useRef, useEffect, useState, useCallback, useMemo} from 'react';
import Sigma from 'sigma';
import {createEdgeArrowProgram} from 'sigma/rendering';
import {DirectedGraph} from 'graphology';
import {circular} from 'graphology-layout';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import {ZoomIn, ZoomOut, Home, RotateCcw, Network, Loader2} from 'lucide-react';

export interface SignalConfig {
    label: string;
    color: string;
    bgClass?: string;
    textClass?: string;
    borderClass?: string;
}

export interface ColorManager {
    getSeverityLevelColor(level: string): string;
    getSignalTypeColor(type: string): string | null;
    getNodeTypeColor(type: string): string;
    getEdgeTypeColor(type: string): string;
}

const DEFAULT_COLOR_MANAGER: ColorManager = {
    getSeverityLevelColor: () => '#6b7280',
    getSignalTypeColor: () => null,
    getNodeTypeColor: () => '#6b7280',
    getEdgeTypeColor: () => '#999999',
};

let _signalConfig: Record<string, SignalConfig> = {};
let _colorManager: ColorManager = DEFAULT_COLOR_MANAGER;
let _signalTypeField = 'signal_type';

declare global {
    interface Window {
        _sigmaMouseMoveCleanup?: () => void;
    }
}

// Visual constants
const TEXT_COLOR = "#000000";
const NODE_FADE_COLOR = "#bbb";
const EDGE_FADE_COLOR = "#eee";
const SHADOW_COLOR = "rgba(0, 0, 0, 0.3)";
const DIRECTIONAL_EDGE_PROGRAM = createEdgeArrowProgram({
    lengthToThicknessRatio: 4.2,
    widenessToThicknessRatio: 2.8,
});

function getNumberOrDefault(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getStringOrEmpty(value: unknown): string {
    return typeof value === 'string' ? value : "";
}

function getStringField(value: unknown, fallback: string): string {
    if (typeof value === 'string' && value.length > 0) {
        return value;
    }
    return fallback;
}

function getObjectOrEmpty(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function pickFirstDefined<T>(...values: Array<T | null | undefined>): T | null {
    for (const value of values) {
        if (value !== null && value !== undefined) {
            return value;
        }
    }
    return null;
}

function getLayoutSetting(layoutOptions: Record<string, unknown>, key: string): unknown {
    const directValue = layoutOptions[key];
    if (directValue !== undefined) {
        return directValue;
    }

    const nestedSettings = getObjectOrEmpty(layoutOptions.settings);
    return nestedSettings[key];
}

function getLayoutNumber(layoutOptions: Record<string, unknown>, key: string, fallback: number): number {
    return getNumberOrDefault(getLayoutSetting(layoutOptions, key), fallback);
}

function getStringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : [];
}

function getLayoutStringArray(layoutOptions: Record<string, unknown>, key: string): string[] {
    const directValue = getStringArray(layoutOptions[key]);
    if (directValue.length > 0) {
        return directValue;
    }

    const nestedSettings = getObjectOrEmpty(layoutOptions.settings);
    return getStringArray(nestedSettings[key]);
}

function getEdgeColor(edgeData: Record<string, unknown>): string {
    const color = edgeData.color;
    return typeof color === 'string' && color.length > 0 ? color : TEXT_COLOR;
}

function getNodeX(data: NodeAttributes): number {
    return getNumberOrDefault(data.x, 0);
}

function getNodeY(data: NodeAttributes): number {
    return getNumberOrDefault(data.y, 0);
}

function getNodeSizeValue(data: NodeAttributes): number {
    return getNumberOrDefault(data.size, 0);
}

function getNodeColorValue(data: NodeAttributes): string {
    return getStringField(data.color, TEXT_COLOR);
}

function isElementTarget(target: EventTarget | null): target is Element {
    return target instanceof Element;
}

/**
 * Draw round rectangle path - from demo canvas-utils
 */
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Custom hover renderer - demo style
 */
function drawHover(context: CanvasRenderingContext2D, data: NodeAttributes, settings: RendererSettings) {
    const size = getNumberOrDefault(settings.labelSize, 12);
    const font = getStringField(settings.labelFont, 'Lato, sans-serif');
    const weight = getStringField(settings.labelWeight, '600');
    const subLabelSize = size - 2;

    const label = getStringOrEmpty(data.label);
    const subLabel = getStringOrEmpty(data.nodeType);

    // Signal node: show signal type label if configured
    const origData = getObjectOrEmpty(data.originalData);
    const signalType = typeof origData[_signalTypeField] === 'string' ? origData[_signalTypeField] as string : '';
    const signalCfg = _signalConfig[signalType] ?? null;
    const clusterLabel = signalCfg
        ? signalCfg.label
        : getStringOrEmpty(data.severityLevel);

    // Draw label background
    context.beginPath();
    context.fillStyle = "#fff";
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 2;
    context.shadowBlur = 8;
    context.shadowColor = SHADOW_COLOR;

    context.font = `${weight} ${size}px ${font}`;
    const labelWidth = context.measureText(label).width;
    context.font = `${weight} ${subLabelSize}px ${font}`;
    const subLabelWidth = subLabel ? context.measureText(subLabel).width : 0;
    context.font = `${weight} ${subLabelSize}px ${font}`;
    const clusterLabelWidth = clusterLabel ? context.measureText(clusterLabel).width : 0;

    const textWidth = Math.max(labelWidth, subLabelWidth, clusterLabelWidth);

    const nodeX = getNodeX(data);
    const nodeY = getNodeY(data);
    const nodeSize = getNodeSizeValue(data);
    const x = Math.round(nodeX);
    const y = Math.round(nodeY);
    const w = Math.round(textWidth + size / 2 + nodeSize + 3);
    const hLabel = Math.round(size / 2 + 4);
    const hSubLabel = subLabel ? Math.round(subLabelSize / 2 + 9) : 0;
    const hClusterLabel = Math.round(subLabelSize / 2 + 9);

    drawRoundRect(context, x, y - hSubLabel - 12, w, hClusterLabel + hLabel + hSubLabel + 12, 5);
    context.closePath();
    context.fill();

    // Signal node: left color bar indicator
    if (signalCfg) {
        context.fillStyle = signalCfg.color;
        context.fillRect(x, y - hSubLabel - 12, 3, hClusterLabel + hLabel + hSubLabel + 12);
    }

    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.shadowBlur = 0;

    // Draw labels
    context.fillStyle = TEXT_COLOR;
    context.font = `${weight} ${size}px ${font}`;
    context.fillText(label, nodeX + nodeSize + 3, nodeY + size / 3);

    if (subLabel) {
        context.fillStyle = TEXT_COLOR;
        context.font = `${weight} ${subLabelSize}px ${font}`;
        context.fillText(subLabel, nodeX + nodeSize + 3, nodeY - (2 * size) / 3 - 2);
    }

    context.fillStyle = signalCfg ? signalCfg.color : getNodeColorValue(data);
    context.font = `${weight} ${subLabelSize}px ${font}`;
    context.fillText(clusterLabel, nodeX + nodeSize + 3, nodeY + size / 3 + 3 + subLabelSize);
}

/**
 * Custom edge label renderer - shows simple labels on edges
 */
function drawEdgeLabel(
    context: CanvasRenderingContext2D,
    edgeData: EdgeAttributes,
    sourceData: NodeAttributes,
    targetData: NodeAttributes,
    settings: RendererSettings
) {
    const edgeLabel = getStringOrEmpty(edgeData.label);
    if (!edgeLabel) {
        return;
    }

    const size = getNumberOrDefault(settings.labelSize, 12) - 2; 
    const font = getStringField(settings.labelFont, 'Lato, sans-serif');
    const weight = getStringField(settings.labelWeight, '600');

    // Compute edge midpoint as label position
    const midX = (getNodeX(sourceData) + getNodeX(targetData)) / 2;
    const midY = (getNodeY(sourceData) + getNodeY(targetData)) / 2;

    // Check if hovered (multi-line label with newlines)
    const isHovered = edgeData._isHovered === true || edgeLabel.includes('\n');

    if (isHovered) {
        // Hover: show detailed multi-line info
        const lines = edgeLabel.split('\n').filter((line: string) => line.trim());
        const lineHeight = size + 2;
        const totalHeight = lines.length * lineHeight + 8; 
        const maxWidth = Math.max(...lines.map((line: string) => {
            context.font = `${weight} ${size}px ${font}`;
            return context.measureText(line).width;
        }));

        const padding = 6;
        const w = maxWidth + padding * 2;
        const h = totalHeight;
        const boxX = midX - w / 2;
        const boxY = midY - h / 2;

        context.save();

        // Draw background
        context.beginPath();
        context.fillStyle = "#fff";
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 2;
        context.shadowBlur = 8;
        context.shadowColor = SHADOW_COLOR;

        drawRoundRect(context, boxX, boxY, w, h, 5);
        context.closePath();
        context.fill();

        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        context.shadowBlur = 0;

        // Draw multi-line text
        context.textAlign = "center";
        context.textBaseline = "middle";

        lines.forEach((line: string, index: number) => {
            const yPos = boxY + padding + (index * lineHeight) + (lineHeight / 2);

            // First line uses edge color, rest use default text color
            if (index === 0) {
                context.fillStyle = getEdgeColor(edgeData);
                context.font = `${weight} ${size}px ${font}`;
            } else {
                context.fillStyle = TEXT_COLOR;
                context.font = `${weight} ${size - 2}px ${font}`;
            }

            context.fillText(line, midX, yPos);
        });

        context.restore();
    } else {
        // Normal: single-line label
        const label = edgeLabel;

        context.save();

        // Draw simple background
        context.font = `${weight} ${size}px ${font}`;
        const textWidth = context.measureText(label).width;
        const padding = 4;
        const w = textWidth + padding * 2;
        const h = size + 4;

        const boxX = midX - w / 2;
        const boxY = midY - h / 2;

        // Semi-transparent background
        context.fillStyle = "rgba(255, 255, 255, 0.9)";
        context.strokeStyle = "rgba(0, 0, 0, 0.2)";
        context.lineWidth = 1;

        drawRoundRect(context, boxX, boxY, w, h, 3);
        context.fill();
        context.stroke();

        // Draw text
        context.fillStyle = getEdgeColor(edgeData);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(label, midX, midY);

        context.restore();
    }
}


/**
 * Custom label renderer - only show text labels beside nodes
 */
function drawLabel(context: CanvasRenderingContext2D, data: NodeAttributes, settings: RendererSettings) {
    const label = getStringOrEmpty(data.label);
    if (!label) return;

    const size = getNumberOrDefault(settings.labelSize, 12);
    const font = getStringField(settings.labelFont, 'Lato, sans-serif');
    const weight = getStringField(settings.labelWeight, '600');

    context.save();
    context.font = `${weight} ${size}px ${font}`;
    const width = context.measureText(label).width + 8;
    const nodeX = getNodeX(data);
    const nodeY = getNodeY(data);
    const nodeSize = getNodeSizeValue(data);

    const bgX = nodeX + nodeSize;
    const bgY = nodeY + size / 3 - 15;

    context.fillStyle = "#ffffffcc";
    context.fillRect(bgX, bgY, width, 20);

    // Signal node: left 2px color bar
    const origData = getObjectOrEmpty(data.originalData);
    const signalType = typeof origData[_signalTypeField] === 'string' ? origData[_signalTypeField] as string : '';
    const signalCfg = _signalConfig[signalType] ?? null;
    if (signalCfg) {
        context.fillStyle = signalCfg.color;
        context.fillRect(bgX, bgY, 2, 20);
    }

    context.fillStyle = "#000";
    context.fillText(label, nodeX + nodeSize + 3, nodeY + size / 3);
    context.restore();
}


/**
 * Compute shortest distance from point to line segment
 * @param px - point x coordinate
 * @param py - point y coordinate
 * @param x1 - segment start x
 * @param y1 - segment start y
 * @param x2 - segment end x
 * @param y2 - segment end y
 * @returns shortest distance
 */
function pointToLineSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        // Degenerate: segment is a point
        return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }

    // Compute projection parameter t (clamped to 0-1)
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t)); // clamp

    // Compute projected point
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    // Return distance to projected point
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}

/**
 * Lightweight Noverlap: grid-based repulsion to reduce overlap
 */
function resolveNodeOverlaps(graph: GraphInstance, options: Record<string, unknown> = {}) {
    const n = graph.order;
    if (n === 0) return;

    const typedOptions = getObjectOrEmpty(options);
    const iterations = getNumberOrDefault(typedOptions.iterations, 120);
    const padding = getNumberOrDefault(typedOptions.padding, 6);
    const gridSize = getNumberOrDefault(
        typedOptions.gridSize,
        Math.max(32, Math.min(140, Math.sqrt(n) * 4))
    );
    const maxStep = getNumberOrDefault(typedOptions.maxStep, 8);

    const nodeRadius = (id: string): number => {
        const s = getNumberOrDefault(graph.getNodeAttribute(id, 'size'), 4);
        return s + padding;
    };

    for (let it = 0; it < iterations; it++) {
        const bins = new Map<string, string[]>();
        const nodes = graph.nodes();
        for (const id of nodes) {
            const {x, y} = graph.getNodeAttributes(id);
            const bx = Math.floor(getNumberOrDefault(x, 0) / gridSize);
            const by = Math.floor(getNumberOrDefault(y, 0) / gridSize);
            const key = `${bx},${by}`;
            if (!bins.has(key)) bins.set(key, []);
            const bucket = bins.get(key);
            if (bucket) {
                bucket.push(id);
            }
        }

        let maxShift = 0;
        for (const [key, arr] of bins.entries()) {
            const [cx, cy] = key.split(',').map(Number);
            const neighborhood: string[] = [];
            for (let dx = -1; dx <= 1; dx++)
                for (let dy = -1; dy <= 1; dy++) {
                    const k = `${cx + dx},${cy + dy}`;
                    const a = bins.get(k);
                    if (a) neighborhood.push(...a);
                }

            for (const a of arr) {
                const pa = graph.getNodeAttributes(a);
                let ax = getNumberOrDefault(pa.x, 0);
                let ay = getNumberOrDefault(pa.y, 0);
                const ra = nodeRadius(a);
                for (const b of neighborhood) {
                    if (a === b) continue;
                    const pb = graph.getNodeAttributes(b);
                    const rb = nodeRadius(b);
                    let dx = ax - getNumberOrDefault(pb.x, 0);
                    let dy = ay - getNumberOrDefault(pb.y, 0);
                    let dist = Math.hypot(dx, dy);
                    const minDist = ra + rb;
                    if (dist === 0) {
                        dx = (Math.random() - 0.5) * 0.01;
                        dy = (Math.random() - 0.5) * 0.01;
                        dist = Math.hypot(dx, dy);
                    }
                    if (dist < minDist) {
                        const overlap = (minDist - dist) / 2;
                        const ux = dx / dist;
                        const uy = dy / dist;
                        const stepX = Math.max(-maxStep, Math.min(maxStep, ux * overlap));
                        const stepY = Math.max(-maxStep, Math.min(maxStep, uy * overlap));
                        ax += stepX;
                        ay += stepY;
                        maxShift = Math.max(maxShift, Math.abs(stepX) + Math.abs(stepY));
                    }
                }
                graph.setNodeAttribute(a, 'x', ax);
                graph.setNodeAttribute(a, 'y', ay);
            }
        }
        if (maxShift < 0.15) break;
    }
}

// Scale layout by factor (uniform around centroid)
function applySpreadFactor(graph: GraphInstance, factor = 1) {
    if (!factor || factor === 1) return;
    try {
        const nodes = graph.nodes();
        if (nodes.length === 0) return;
        let cx = 0, cy = 0;
        nodes.forEach((id: string) => {
            const a = graph.getNodeAttributes(id);
            cx += getNumberOrDefault(a.x, 0);
            cy += getNumberOrDefault(a.y, 0);
        });
        cx /= nodes.length;
        cy /= nodes.length;
        nodes.forEach((id: string) => {
            const a = graph.getNodeAttributes(id);
            const nx = cx + (getNumberOrDefault(a.x, 0) - cx) * factor;
            const ny = cy + (getNumberOrDefault(a.y, 0) - cy) * factor;
            graph.setNodeAttribute(id, 'x', nx);
            graph.setNodeAttribute(id, 'y', ny);
        });
    } catch (e) { /* empty */ }
}

/**
 * Electron shell layout: group nodes by type into concentric rings
 */
function applyElectronShellLayout(graph: GraphInstance, layoutOptions: LayoutOptions) {
    const minNodeSpacing = getLayoutNumber(layoutOptions, 'minNodeSpacing', 30);
    const minRingGap = getLayoutNumber(layoutOptions, 'minRingGap', 60);

    // Step 1: Group nodes by type
    const typeGroups: Record<string, string[]> = {};
    graph.forEachNode((nodeId: string, attributes: NodeAttributes) => {
        const type = getStringField(attributes.nodeType, 'unknown');
        if (!typeGroups[type]) {
            typeGroups[type] = [];
        }
        typeGroups[type].push(nodeId);
    });

    // Step 2: Sort types by count ascending (fewest -> innermost ring)
    const sortedTypes = Object.entries(typeGroups).sort((a, b) => a[1].length - b[1].length);
    if (sortedTypes.length === 0) return;

    // Step 3: Two-pass radius calculation
    // Pass 1 -- compute the "natural" radius each ring needs so its own nodes
    // sit at least minNodeSpacing apart along the circumference.
    const naturalRadii = sortedTypes.map(([, nodeIds]) => {
        const count = nodeIds.length;
        if (count <= 1) return 0;
        return (count * minNodeSpacing) / (2 * Math.PI);
    });

    // Pass 2 -- enforce monotonically increasing radii with guaranteed minimum
    // gap between every consecutive pair of rings.
    const radii: number[] = [];
    for (let i = 0; i < naturalRadii.length; i++) {
        if (i === 0) {
            // innermost ring: at least minRingGap from center so it's not a dot
            radii.push(Math.max(naturalRadii[i], minRingGap));
        } else {
            // must be at least (previous radius + gap) AND fit its own nodes
            const candidate = Math.max(radii[i - 1] + minRingGap, naturalRadii[i]);
            // extra safety: if candidate barely clears previous, bump by minRingGap
            const gap = candidate - radii[i - 1];
            radii.push(gap < minRingGap ? radii[i - 1] + minRingGap : candidate);
        }
    }

    // Step 4: Assign positions
    sortedTypes.forEach(([_type, nodeIds], ringIndex) => {
        const radius = radii[ringIndex];
        const count = nodeIds.length;
        nodeIds.forEach((nodeId, i) => {
            const angle = count === 1 ? 0 : (2 * Math.PI * i) / count;
            graph.setNodeAttribute(nodeId, 'x', radius * Math.cos(angle));
            graph.setNodeAttribute(nodeId, 'y', radius * Math.sin(angle));
        });
    });

    // Step 5: Shrink all nodes for cleaner concentric appearance
    graph.forEachNode((nodeId: string, attributes: NodeAttributes) => {
        const currentSize = getNumberOrDefault(attributes.size, 5);
        graph.setNodeAttribute(nodeId, 'size', Math.max(0.8, currentSize * 0.4));
    });
}


/**
 * Hierarchical layout: layer nodes by type, respecting configured layerOrder.
 */
function applyHierarchicalLayerLayout(graph: GraphInstance, layoutOptions: LayoutOptions) {
    const nodeSpacing = Math.max(40, getLayoutNumber(layoutOptions, 'nodeSpacing', 80));
    const layerGap = Math.max(80, getLayoutNumber(layoutOptions, 'layerGap', 150));
    const rowGap = Math.max(50, getLayoutNumber(layoutOptions, 'rowGap', 70));
    const configuredMaxPerRow = Math.floor(getLayoutNumber(layoutOptions, 'maxNodesPerRow', 0));
    const nodeTypeField = getStringField(getLayoutSetting(layoutOptions, 'nodeTypeField'), 'type');
    const layerOrder = getLayoutStringArray(layoutOptions, 'layerOrder');

    const typeGroups = new Map<string, string[]>();
    graph.forEachNode((nodeId: string, attributes: NodeAttributes) => {
        const originalData = getObjectOrEmpty(attributes.originalData);
        const type = getStringField(
            attributes.nodeType,
            getStringField(originalData[nodeTypeField], 'unknown')
        );
        const group = typeGroups.get(type) ?? [];
        group.push(nodeId);
        typeGroups.set(type, group);
    });

    if (typeGroups.size === 0) {
        return;
    }

    const orderedTypes: string[] = [];
    const seenTypes = new Set<string>();
    layerOrder.forEach((type) => {
        if (typeGroups.has(type) && !seenTypes.has(type)) {
            orderedTypes.push(type);
            seenTypes.add(type);
        }
    });
    Array.from(typeGroups.keys())
        .filter((type) => !seenTypes.has(type))
        .sort((a, b) => a.localeCompare(b))
        .forEach((type) => orderedTypes.push(type));

    const largestLayerSize = Math.max(...orderedTypes.map((type) => typeGroups.get(type)?.length ?? 0), 1);
    const maxNodesPerRow = configuredMaxPerRow > 0
        ? configuredMaxPerRow
        : Math.max(4, Math.ceil(Math.sqrt(largestLayerSize) * 2));

    let cursorY = 0;
    const assignedLayers: Array<{ type: string; startY: number; rows: number }> = [];

    orderedTypes.forEach((type) => {
        const nodeIds = typeGroups.get(type) ?? [];
        const rows = Math.max(1, Math.ceil(nodeIds.length / maxNodesPerRow));
        assignedLayers.push({type, startY: cursorY, rows});
        cursorY += (rows - 1) * rowGap + layerGap;
    });

    const totalHeight = cursorY - layerGap;
    const yOffset = totalHeight / 2;

    assignedLayers.forEach(({type, startY}) => {
        const nodeIds = typeGroups.get(type) ?? [];
        nodeIds.forEach((nodeId, index) => {
            const row = Math.floor(index / maxNodesPerRow);
            const indexInRow = index % maxNodesPerRow;
            const nodesInRow = Math.min(maxNodesPerRow, nodeIds.length - row * maxNodesPerRow);
            const rowWidth = (nodesInRow - 1) * nodeSpacing;

            graph.setNodeAttribute(nodeId, 'x', indexInRow * nodeSpacing - rowWidth / 2);
            graph.setNodeAttribute(nodeId, 'y', startY + row * rowGap - yOffset);
        });
    });
}

/**
 * Grid layout: arrange by type in rows with uniform spacing
 */
function applyGridLayout(graph: GraphInstance, layoutOptions: LayoutOptions) {
    const cellWidth = getLayoutNumber(layoutOptions, 'cellWidth', 40);
    const rowHeight = getLayoutNumber(layoutOptions, 'rowHeight', 100);

    // Group by type, sort by count descending (largest group = top row)
    const typeGroups: Record<string, string[]> = {};
    graph.forEachNode((nodeId: string, attributes: NodeAttributes) => {
        const type = getStringField(attributes.nodeType, 'unknown');
        if (!typeGroups[type]) typeGroups[type] = [];
        typeGroups[type].push(nodeId);
    });

    const sortedGroups = Object.entries(typeGroups).sort((a, b) => b[1].length - a[1].length);

    sortedGroups.forEach(([_type, nodeIds], rowIndex) => {
        const count = nodeIds.length;
        const rowWidth = (count - 1) * cellWidth;
        const startX = -rowWidth / 2; // center the row
        const y = rowIndex * rowHeight;

        nodeIds.forEach((nodeId, colIndex) => {
            graph.setNodeAttribute(nodeId, 'x', startX + colIndex * cellWidth);
            graph.setNodeAttribute(nodeId, 'y', y);
        });
    });
}

/**
 * Apply layout to graph
 */
function applyLayoutToGraph(graph: GraphInstance, layoutOptions: LayoutOptions) {
    if (graph.nodes().length === 0) {
        return;
    }

    if (layoutOptions.type === 'force' && forceAtlas2) {
        try {
            // Start with circular layout for consistent initial state
            circular.assign(graph);
            const resolvedOptions = getObjectOrEmpty(layoutOptions);
            const rawSettings = getObjectOrEmpty(resolvedOptions.settings);
            const finalConfig = {
                iterations: getNumberOrDefault(resolvedOptions.iterations, 420),
                settings: {
                    gravity: 0.08,
                    scalingRatio: 100, 
                    strongGravityMode: true, 
                    outboundAttractionDistribution: false, 
                    linLogMode: false, 
                    adjustSizes: false,
                    edgeWeightInfluence: 0.6, 
                    barnesHutOptimize: true,
                    barnesHutTheta: 0.6,
                    slowDown: 1.6,
                    ...rawSettings
                }
            };
            forceAtlas2.assign(graph, finalConfig);
            // Apply spread factor
            const spread = getNumberOrDefault(resolvedOptions.spreadFactor, 2.0);
            if (spread && spread !== 1) applySpreadFactor(graph, spread);
            // Post-layout noverlap pass
            resolveNodeOverlaps(graph, {
                iterations: getNumberOrDefault(resolvedOptions.noverlapIterations, 140),
                padding: getNumberOrDefault(resolvedOptions.noverlapPadding, 6),
                gridSize: resolvedOptions.noverlapGrid,
                maxStep: 8
            });
        } catch (e) {
            console.warn('ForceAtlas2 layout failed, falling back to circular:', e);
            circular.assign(graph);
        }
    } else if (layoutOptions.type === 'hierarchical') {
        applyHierarchicalLayerLayout(graph, layoutOptions);
    } else if (layoutOptions.type === 'electron') {
        applyElectronShellLayout(graph, layoutOptions);
    } else if (layoutOptions.type === 'grid') {
        applyGridLayout(graph, layoutOptions);
    } else {
        circular.assign(graph);
    }
}

/**
 * SigmaGraph - Clean implementation based on demo
 */
interface NodeAttributes {
    x?: number;
    y?: number;
    size?: number;
    color?: string;
    label?: string;
    type?: string;
    nodeType?: string;
    severityLevel?: string;
    category?: string;
    hidden?: boolean;
    highlighted?: boolean;
    forceLabel?: boolean;
    zIndex?: number;
    [key: string]: any;
}

interface EdgeAttributes {
    size?: number;
    color?: string;
    label?: string;
    type?: string;
    hidden?: boolean;
    forceLabel?: boolean;
    zIndex?: number;
    [key: string]: any;
}

export interface FieldMapping {
    nodeType?: string;
    nodeCategory?: string;
    nodeLabel?: string;
    nodeName?: string;
    riskLevelField?: string;
    signalNodeType?: string;
    degreeField?: string;
    sizeField?: string;
    inDegreeField?: string;
    outDegreeField?: string;
}

interface LayoutOptions {
    type?: string;
    iterations?: number;
    settings?: Record<string, any>;
    [key: string]: any;
}

type GraphAttributes = Record<string, unknown>;
type GraphInstance = DirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
type RendererSettings = {
    labelSize?: number;
    labelFont?: string;
    labelWeight?: string | number;
};
type TooltipData = {
    edgeType: string;
    sourceName: string;
    targetName: string;
    weight?: unknown;
    edgeData?: unknown;
    sourceNodeData?: unknown;
    targetNodeData?: unknown;
};

const getTooltipText = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || null;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return null;
};

const resolveEdgeTooltipLabel = (tooltipData: TooltipData): string => {
    const edgeData = getObjectOrEmpty(tooltipData.edgeData);
    const edgeType = getTooltipText(tooltipData.edgeType);
    const candidates = [
        edgeData.display_name,
        edgeData.vuln_name,
        edgeData.value,
        edgeData.title,
        edgeData.name,
        edgeData.vuln_id,
        edgeData.cve_id,
        edgeData.cve,
        edgeData.template_id,
    ];
    let fallback = edgeType ?? 'unknown';

    for (const candidate of candidates) {
        const text = getTooltipText(candidate);
        if (!text) continue;
        fallback = text;
        if (text !== edgeType) {
            return text;
        }
    }

    return fallback;
};

export interface SigmaGraphProps {
    nodes?: any[];
    edges?: any[];
    selectedNodeId?: string | null;
    hoveredNodeId?: string | null;
    highlightedNodeId?: string | null;
    focusNodeId?: string | null;
    onNodeClick?: (nodeData: any, nodeId: string) => void;
    onNodeDoubleClick?: (nodeData: any, nodeId: string) => void;
    onNodeRightClick?: (nodeData: any, nodeId: string, event: MouseEvent) => void;
    onNodeHover?: (nodeData: any, nodeId: string) => void;
    onNodeLeave?: (nodeId: string) => void;
    onEdgeClick?: (edgeData: any, edgeId: string) => void;
    onEdgeDoubleClick?: (edgeData: any, edgeId: string, sourceNode?: any, targetNode?: any) => void;
    nodeColorMapper?: ((node: any) => string) | null;
    nodeSizeMapper?: ((node: any) => number) | null;
    layoutOptions?: LayoutOptions;
    className?: string;
    height?: string;
    matchingNodeIds?: Set<string>;
    relationshipColorMap?: Record<string, string>;
    edgeTooltipRenderer?: ((edgeData: any) => string) | null;
    fieldMapping?: FieldMapping;
    signalConfig?: Record<string, SignalConfig>;
    signalTypeField?: string;
    colorManager?: ColorManager;
}

const SigmaGraph: React.FC<SigmaGraphProps> = ({
                        nodes = [],
                        edges = [],
                        selectedNodeId,
                        hoveredNodeId,
                        highlightedNodeId,
                        focusNodeId: _focusNodeId,
                        onNodeClick,
                        onNodeDoubleClick,
                        onNodeRightClick,
                        onNodeHover,
                        onNodeLeave,
                        onEdgeClick,
                        onEdgeDoubleClick,
                        nodeColorMapper,
                        nodeSizeMapper,
                        layoutOptions = {type: 'force'},
                        className = "",
                        height = "400px",
                        matchingNodeIds = new Set(),
                        relationshipColorMap = {},
                        edgeTooltipRenderer = null,
                        fieldMapping = {
                            nodeType: 'type',
                            nodeCategory: 'severityLevel',
                            nodeLabel: 'label',
                            nodeName: 'name'
                        },
                        signalConfig = {},
                        signalTypeField = 'signal_type',
                        colorManager = DEFAULT_COLOR_MANAGER,
                    }) => {
    _signalConfig = signalConfig;
    _colorManager = colorManager;
    _signalTypeField = signalTypeField;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const sigmaRef = useRef<Sigma<NodeAttributes, EdgeAttributes, GraphAttributes> | null>(null);
    const graphRef = useRef<GraphInstance | null>(null);
    const isMountedRef = useRef(true);
    const hoveredEdgeRef = useRef<string | null>(null); 

    
    const callbacksRef = useRef({
        onNodeClick,
        onNodeDoubleClick,
        onNodeRightClick,
        onNodeHover,
        onNodeLeave,
        onEdgeClick,
        onEdgeDoubleClick
    });

    
    useEffect(() => {
        callbacksRef.current = {
            onNodeClick,
            onNodeDoubleClick,
            onNodeRightClick,
            onNodeHover,
            onNodeLeave,
            onEdgeClick,
            onEdgeDoubleClick
        };
    });
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null); 
    const [pinnedEdgeId, setPinnedEdgeId] = useState<string | null>(null); 
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null); 
    // FA2 live tuning state
    const [showTuning, setShowTuning] = useState(false);
    const [fa2Tuning, setFa2Tuning] = useState({
        enabled: true,
        iterations: 100,
        gravity: 0.12,
        scalingRatio: 12,
        edgeWeightInfluence: 0.7,
        slowDown: 1.6,
        linLogMode: true,
        strongGravityMode: true,
        outboundAttractionDistribution: false,
        barnesHutTheta: 0.6
    });

    // Merge external and local tuning options
    const mergedLayoutOptions = useMemo(() => {
        const base = layoutOptions && typeof layoutOptions === 'object' ? layoutOptions : {};
        const baseSettings = base.settings && typeof base.settings === 'object' ? base.settings : {};
        const mergedSettings = {...baseSettings};
        if (fa2Tuning.enabled) {
            Object.assign(mergedSettings, {
                gravity: fa2Tuning.gravity,
                scalingRatio: fa2Tuning.scalingRatio,
                edgeWeightInfluence: fa2Tuning.edgeWeightInfluence,
                slowDown: fa2Tuning.slowDown,
                linLogMode: fa2Tuning.linLogMode,
                strongGravityMode: fa2Tuning.strongGravityMode,
                outboundAttractionDistribution: fa2Tuning.outboundAttractionDistribution,
                barnesHutTheta: fa2Tuning.barnesHutTheta
            });
        }
        return {
            ...base,
            iterations: fa2Tuning.enabled ? fa2Tuning.iterations : base.iterations,
            settings: mergedSettings
        };
    }, [layoutOptions, fa2Tuning]);

    // Track mount state
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    
    // Default node color mapper
    const defaultNodeColor = useCallback((node: any) => {
        let baseColor;

        const riskField = getStringField(fieldMapping.riskLevelField, 'risk_level');
        const signalField = _signalTypeField;
        const typeField = getStringField(fieldMapping.nodeType, 'type');

        // Highest priority: risk level coloring
        if (node[riskField] && node[riskField] !== 'none') {
            return _colorManager.getSeverityLevelColor(node[riskField]);
        }

        // Signal node: use signal-type-specific color
        const signalNodeType = getStringField(fieldMapping.signalNodeType, 'vuln');
        const signalColor = _colorManager.getSignalTypeColor(node[signalField] ?? '');
        if (signalColor && node[typeField] === signalNodeType) {
            return signalColor;
        }

        // Configurable field mapping
        const categoryField = getStringField(fieldMapping.nodeCategory, 'severityLevel');
        const categoryValue = node[categoryField];
        const typeValue = node[typeField];

        // Priority: category level color
        if (categoryValue) {
            baseColor = _colorManager.getSeverityLevelColor(categoryValue);
        }
        // Then node type color
        else if (typeValue) {
            baseColor = _colorManager.getNodeTypeColor(typeValue);
        }
        // Fallback: custom color or default
        else {
            baseColor = getStringField(node.color, _colorManager.getNodeTypeColor('default'));
        }

        return baseColor;
    }, [fieldMapping]);

    const defaultNodeSize = useCallback((node: any) => {
        const degreeField = getStringField(fieldMapping.degreeField, 'degree');
        const sizeField = getStringField(fieldMapping.sizeField, 'size');
        const inDegreeField = getStringField(fieldMapping.inDegreeField, 'in_degree');
        const outDegreeField = getStringField(fieldMapping.outDegreeField, 'out_degree');
        const typeField = getStringField(fieldMapping.nodeType, 'type');

        // Composite degree: sum of in/out degree fields if available
        const compositeDegree = (typeof node[inDegreeField] === 'number' || typeof node[outDegreeField] === 'number')
            ? (Number(node[inDegreeField] ?? 0) + Number(node[outDegreeField] ?? 0))
            : null;
        const degree = compositeDegree ?? Number(getNumberOrDefault(node[degreeField], 0));
        const base = 2.2 + Math.sqrt(Math.max(0, degree)) * 0.9;
        const requested = node[sizeField] ? Number(node[sizeField]) : 0;
        const raw = Math.max(base, requested ? Math.min(requested, 10) : base);
        const scaled = raw / 6;
        let finalSize = Math.max(0.1, Math.min(3, scaled)) * 0.6;
        // Signal nodes get slight size boost
        if (_signalConfig[node[_signalTypeField] ?? '']) {
            finalSize *= 1.3;
        }
        return finalSize;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fieldMapping]);

    // Edge color: use relationship color map, fallback to colorManager
    const defaultEdgeColor = useCallback((edge: any, sourceNode: any, targetNode: any) => {
        const edgeType = getStringField(edge.type, 'default');
        const mappedColor = relationshipColorMap[edgeType];
        if (typeof mappedColor === 'string' && mappedColor.length > 0) {
            return mappedColor;
        }
        return _colorManager.getEdgeTypeColor(edgeType);
    }, [relationshipColorMap]);

    // Default edge tooltip builder
    const createDefaultEdgeTooltip = useCallback((tooltipData: any, mode: string) => {
        const { edgeType, sourceName, targetName, weight } = tooltipData;
        const directionLabel = `${sourceName} -> ${targetName}`;
        const edgeLabel = resolveEdgeTooltipLabel(tooltipData);
        const typeText = getTooltipText(edgeType);

        if (mode === 'hover') {
            // Hover: show detailed multi-line info
            const primaryLabel = edgeLabel !== typeText
                ? edgeLabel
                : `Type: ${edgeLabel}`;
            const lines = [
                directionLabel,
                primaryLabel,
                typeText && edgeLabel !== typeText ? `Type: ${typeText}` : '',
                weight ? `Weight: ${weight}` : ''
            ].filter(Boolean);

            return lines.join('\n');
        } else {
            // Normal: concise label, direction shown by arrow
            return edgeLabel;
        }
    }, []);

    // Edge size calculation
    const defaultEdgeSize = useCallback((edge: any) => {
        const weight = getNumberOrDefault(edge.weight, 1);
        const baseSize = 0.8; 
        return Math.max(0.5, Math.min(3, baseSize * Math.sqrt(weight))); 
    }, []);


    // Simplified Sigma settings
    const sigmaSettings = useMemo(() => ({
        defaultDrawNodeLabel: drawLabel,
        defaultDrawNodeHover: drawHover,
        defaultDrawEdgeLabel: drawEdgeLabel, 
        defaultNodeType: "force",
        defaultEdgeType: "arrow",
        labelDensity: 0.07,
        labelGridCellSize: 60,
        labelRenderedSizeThreshold: 8,
        labelFont: "Lato, sans-serif",
        labelSize: 10,
        labelWeight: "600",
        zIndex: true,
        enableCameraInteraction: true,
        renderLabels: true,
        renderEdgeLabels: true, 
        minNodeSize: 0.1,
        maxNodeSize: 3, 
        minEdgeThickness: 1.8,
        enableEdgeClickEvents: true,
        enableEdgeHoverEvents: true,
        enableEdgeWheelEvents: false,
        scalingMode: 'scaled',
        nodeReductionRatio: 0,
        edgeSize: 0.8, 
        minEdgeSize: 0.5, 
        maxEdgeSize: 3, 
        edgeHitTolerance: 40,
        allowInvalidContainer: true,
        edgeProgramClasses: {
            arrow: DIRECTIONAL_EDGE_PROGRAM
        },
        stagePadding: 8,
        pixelRatio: getNumberOrDefault(window.devicePixelRatio, 1),
        // Disable double-click zoom
        mouseWheelZoomEnabled: true,
        doubleClickZoomEnabled: false,
        doubleClickZoomingRatio: 1,
    }), []);

  
    // Initialize graph
    useEffect(() => {
        if (!containerRef.current) return;

        // Ensure container has dimensions
        const container = containerRef.current;
        if (!container.offsetHeight || !container.offsetWidth) {
            const timeoutId = setTimeout(() => {
                if (isMountedRef.current) setIsInitialized(false);
            }, 100);
            return () => clearTimeout(timeoutId);
        }

        if (nodes.length === 0) {
            // Clean existing instance
            if (sigmaRef.current) {
                try { sigmaRef.current.kill(); sigmaRef.current = null; } catch (e) { /* empty */ }
            }
            if (graphRef.current) {
                try { graphRef.current.clear(); graphRef.current = null; } catch (e) { /* empty */ }
            }
            if (isInitialized) setIsInitialized(false);
            return;
        }

        setError(null);

        // Clean old instance
        if (sigmaRef.current) {
            try {
                sigmaRef.current.removeAllListeners();
                sigmaRef.current.kill();
                sigmaRef.current = null;
            } catch (e) { /* empty */ }
        }
        if (graphRef.current) {
            try {
                graphRef.current.clear();
                graphRef.current = null;
            } catch (e) { /* empty */ }
        }

        // Create graph - DirectedGraph like demo
        const graph = new DirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        graphRef.current = graph;

        const getNodeColor = nodeColorMapper ? nodeColorMapper : defaultNodeColor;
        const getNodeSize = nodeSizeMapper ? nodeSizeMapper : defaultNodeSize;
        const typeField = getStringField(fieldMapping.nodeType, 'type');
        const categoryField = getStringField(fieldMapping.nodeCategory, 'severityLevel');
        const labelField = getStringField(fieldMapping.nodeLabel, 'label');
        const nameField = getStringField(fieldMapping.nodeName, 'name');

        // Add nodes
        nodes.forEach((node) => {
            const nodeId = String(node.id);
            if (!graph.hasNode(nodeId)) {
                const label = getStringField(
                    node[labelField],
                    getStringField(node[nameField], String(node.id))
                );
                graph.addNode(nodeId, {
                    x: Math.random() * 500,
                    y: Math.random() * 400,
                    size: getNodeSize(node),
                    label: label,
                    color: getNodeColor(node),
                    type: "circle", // Sigma.js node rendering type - use standard type instead of custom type
                    nodeType: getStringOrEmpty(node[typeField]),
                    severityLevel: getStringOrEmpty(node[categoryField]),
                    originalData: node
                });
            }
        });

        // Add edges
        edges.forEach((edge) => {
            if (!edge?.source || !edge?.target || !edge?.id || !edge?.type) return;

            const fromId = String(edge.source);
            const toId = String(edge.target);
            const edgeId = String(edge.id);

            if (graph.hasNode(fromId) && graph.hasNode(toId)) {
                const sourceNode = nodes.find(n => String(n.id) === fromId);
                const targetNode = nodes.find(n => String(n.id) === toId);
                if (!sourceNode || !targetNode) return;

                const edgeSize = defaultEdgeSize(edge);
                const edgeColor = defaultEdgeColor(edge, sourceNode, targetNode);

                
                const _edgeSeverity = edge.severity ?
                    (edge.severity === 'critical' ? 4 : edge.severity === 'high' ? 3 : edge.severity === 'medium' ? 2 : edge.severity === 'low' ? 1 : 0) : 0;

                // Build tooltip data
                const tooltipData = {
                    edgeType: edge.type,
                    sourceName: sourceNode.name,
                    targetName: targetNode.name,
                    weight: edge.weight,
                    edgeData: edge,
                    sourceNodeData: sourceNode,
                    targetNodeData: targetNode
                };

                // Generate label via custom or default renderer
                const defaultLabel = edgeTooltipRenderer
                    // @ts-ignore
                    ? edgeTooltipRenderer(tooltipData, 'normal')
                    : createDefaultEdgeTooltip(tooltipData, 'normal');

                // Simple edge addition - skip duplicates
                if (!graph.hasEdge(fromId, toId)) {
                    graph.addEdge(fromId, toId, {
                        id: edgeId,
                        size: edgeSize,
                        color: edgeColor,
                        type: "arrow",
                        weight: getNumberOrDefault(edge.weight, 1),
                        relationshipType: edge.type,
                        sourceName: tooltipData.sourceName,
                        targetName: tooltipData.targetName,
                        label: defaultLabel,
                        zIndex: 1,
                        originalData: edge,
                        
                        _tooltipData: tooltipData
                    });
                }
            }
        });


        // Apply layout using unified function
        applyLayoutToGraph(graph, mergedLayoutOptions);


        // Create Sigma instance with error handling
        try {
            const sigma = new Sigma(graph, containerRef.current, sigmaSettings as any);
            sigmaRef.current = sigma;

            // Container-level event listeners for edge click/dblclick detection
            const container = containerRef.current;
            if (container) {
                // Detect clicked edge
                const detectClickedEdge = (x: number, y: number): string | null => {
                    let clickedEdge: string | null = null;
                    let minDistance = Infinity;

                    graph.forEachEdge((edge, attributes, source, target) => {
                        try {
                            // @ts-ignore
                            const sourceViewport = sigma.graphToViewport(graph.getNodeAttributes(source));
                            // @ts-ignore
                            const targetViewport = sigma.graphToViewport(graph.getNodeAttributes(target));
                            const distance = pointToLineSegmentDistance(
                                x, y,
                                sourceViewport.x, sourceViewport.y,
                                targetViewport.x, targetViewport.y
                            );
                            if (distance < minDistance) {
                                minDistance = distance;
                                clickedEdge = edge;
                            }
                        } catch (e) {
                            // ignore errors
                        }
                    });

                    return clickedEdge && minDistance < 10 ? clickedEdge : null;
                };

                // Detect clicked node
                const detectClickedNode = (x: number, y: number): string | null => {
                    let clickedNode: string | null = null;
                    let minDistance = Infinity;

                    graph.forEachNode((node, attributes) => {
                        try {
                            // @ts-ignore
                            const nodeViewport = sigma.graphToViewport(attributes);
                            const distance = Math.sqrt(
                                Math.pow(x - nodeViewport.x, 2) +
                                Math.pow(y - nodeViewport.y, 2)
                            );

                            const nodeSize = getNumberOrDefault(attributes.size, 5);
                            if (distance < nodeSize && distance < minDistance) {
                                minDistance = distance;
                                clickedNode = node;
                            }
                        } catch (e) {
                            // ignore errors
                        }
                    });

                    return clickedNode;
                };

                // Double-click handler for nodes and edges
                container.addEventListener('dblclick', (nativeEvent) => {
                    // Ignore clicks on context menu
                    // @ts-ignore
                    if (nativeEvent.target.closest('[data-submenu]') || nativeEvent.target.closest('.context-menu')) {
                        return;
                    }
                    // @ts-ignore
                    if (nativeEvent.target.tagName.toLowerCase() === 'canvas') {
                        // @ts-ignore
                        const rect = nativeEvent.target.getBoundingClientRect();
                        const x = nativeEvent.clientX - rect.left;
                        const y = nativeEvent.clientY - rect.top;

                        // Check if a node was clicked
                        const clickedNode = detectClickedNode(x, y);

                        if (clickedNode) {
                            const nodeData = graph.getNodeAttributes(clickedNode);
                            callbacksRef.current.onNodeDoubleClick?.(nodeData.originalData, clickedNode);

                            nativeEvent.preventDefault();
                            nativeEvent.stopPropagation();
                            return false;
                        }

                        // If no node, check if an edge was clicked
                        const clickedEdge = detectClickedEdge(x, y);

                        if (clickedEdge) {
                            const edgeData = graph.getEdgeAttributes(clickedEdge);
                            callbacksRef.current.onEdgeDoubleClick?.(edgeData.originalData, clickedEdge);

                            nativeEvent.preventDefault();
                            nativeEvent.stopPropagation();
                            return false;
                        }
                    }
                }, { capture: true });

                // Click handler: blank area click clears edge pinning
                container.addEventListener('click', (nativeEvent) => {
                    // Ignore clicks on context menu
                    // @ts-ignore
                    if (nativeEvent.target.closest('[data-submenu]') || nativeEvent.target.closest('.context-menu')) {
                        return;
                    }
                    // @ts-ignore
                    if (nativeEvent.target.tagName.toLowerCase() === 'canvas') {
                        // @ts-ignore
                        const rect = nativeEvent.target.getBoundingClientRect();
                        const x = nativeEvent.clientX - rect.left;
                        const y = nativeEvent.clientY - rect.top;

                        const clickedEdge = detectClickedEdge(x, y);
                        if (!clickedEdge) {
                            const clickedNode = detectClickedNode(x, y);
                            if (!clickedNode) {
                                // Blank area: clear pinned edge
                                
                                setPinnedEdgeId(null);
                            }
                        }
                    }
                }, { capture: true });
            }

                } catch (error) {
            console.warn('Sigma initialization failed:', error);
            // Retry with explicit dimensions
            if (containerRef.current) {
                const container = containerRef.current;
                if (!container.style.height) {
                    container.style.height = height;
                }
                if (!container.style.width) {
                    container.style.width = '100%';
                }

                // Retry initialization
                try {
                    const sigma = new Sigma(graph, containerRef.current, sigmaSettings as any);
                    sigmaRef.current = sigma;
                } catch (retryError) {
                    console.error('Sigma initialization failed on retry:', retryError);
                    setError('Graph initialization failed');
                    return;
                }
            } else {
                setError('Graph container unavailable');
                return;
            }
        }

        // Add event listeners
        const sigma = sigmaRef.current;

        
        sigma.on('clickNode', ({node}) => {
            const nodeData = graph.getNodeAttributes(node);

            // Handle pin/unpin on click
            setPinnedNodeId(currentPinnedNodeId => {
                const willCancel = currentPinnedNodeId === node;

                // Async callback to avoid setState during render
                setTimeout(() => {
                    if (willCancel) {
                        callbacksRef.current.onNodeClick?.(null, node);
                    } else {
                        callbacksRef.current.onNodeClick?.(nodeData.originalData, node);
                    }
                }, 0);

                return willCancel ? null : node;
            });
        });

        // Standard Sigma.js event listeners
        sigma.on('doubleClickNode', ({node}) => {
            const nodeData = graph.getNodeAttributes(node);
            callbacksRef.current.onNodeDoubleClick?.(nodeData.originalData, node);
        });

        sigma.on('doubleClickEdge', ({edge}) => {
            const edgeData = graph.getEdgeAttributes(edge);
            callbacksRef.current.onEdgeDoubleClick?.(edgeData.originalData, edge);
        });

        sigma.on('rightClickNode', ({node, event}) => {
            const nodeData = graph.getNodeAttributes(node);
            // @ts-ignore
            callbacksRef.current.onNodeRightClick?.(nodeData.originalData, node, event.original);
        });

        sigma.on('enterNode', ({node}) => {
            const nodeData = graph.getNodeAttributes(node);
            callbacksRef.current.onNodeHover?.(nodeData.originalData, node);
        });

        sigma.on('leaveNode', ({node}) => {
            callbacksRef.current.onNodeLeave?.(node);
        });

        // Manual edge hover detection via native mousemove
        let lastHoveredEdge: string | null = null;
        const handleMouseMove = (nativeEvent: MouseEvent) => {
            // Ignore mouse moves over context menu
            if (isElementTarget(nativeEvent.target) && (
                nativeEvent.target.closest('[data-submenu]') ||
                nativeEvent.target.closest('.context-menu')
            )) {
                return;
            }
            // Get mouse position on canvas
            const activeContainer = containerRef.current;
            if (!activeContainer) {
                return;
            }
            const rect = activeContainer.getBoundingClientRect();
            const viewportX = nativeEvent.clientX - rect.left;
            const viewportY = nativeEvent.clientY - rect.top;

            const hoverTolerance = 15; 

            let hoveredEdge: string | null = null;
            let minDistance = Infinity;

            graph.forEachEdge((edge, attributes, source, target) => {
                try {
                    // Get node viewport coordinates
                    // @ts-ignore
                    const sourceViewport = sigma.graphToViewport(graph.getNodeAttributes(source));
                    // @ts-ignore
                    const targetViewport = sigma.graphToViewport(graph.getNodeAttributes(target));

                    const distance = pointToLineSegmentDistance(
                        viewportX, viewportY,
                        sourceViewport.x, sourceViewport.y,
                        targetViewport.x, targetViewport.y
                    );
                    if (distance < minDistance) {
                        minDistance = distance;
                        hoveredEdge = edge;
                    }
                } catch (e) {
                    // ignore
                }
            });

            // Only treat as hover if within tolerance
            if (minDistance > hoverTolerance) {
                hoveredEdge = null;
            }

            // Detect hover state changes
            if (hoveredEdge !== lastHoveredEdge) {
                setHoveredEdgeId(hoveredEdge);
                hoveredEdgeRef.current = hoveredEdge;
                lastHoveredEdge = hoveredEdge;
            }
        };

        // Attach native event listener on Sigma container
        const canvasContainer = containerRef.current;
        if (canvasContainer) {
            // Throttle to ~60fps
            let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
            const throttledMouseMove = (e: MouseEvent) => {
                if (!throttleTimeout) {
                    throttleTimeout = setTimeout(() => {
                        handleMouseMove(e);
                        throttleTimeout = null;
                    }, 16); // ~60fps
                }
            };

            canvasContainer.addEventListener('mousemove', throttledMouseMove);

            // Remove listener on cleanup
            const cleanup = () => {
                canvasContainer.removeEventListener('mousemove', throttledMouseMove);
                if (throttleTimeout) clearTimeout(throttleTimeout);
            };

            // Store cleanup for later
            window._sigmaMouseMoveCleanup = cleanup;
        }

        // Edge event handlers
        sigma.on('clickEdge', ({edge}) => {
            const edgeData = graph.getEdgeAttributes(edge);

            // Pin/unpin edge on click
            setPinnedEdgeId(currentPinnedEdgeId => {
                const willCancel = currentPinnedEdgeId === edge;
                const newPinnedEdgeId = willCancel ? null : edge;

                // Async callback to avoid setState during render
                setTimeout(() => {
                    if (willCancel) {
                        callbacksRef.current.onEdgeClick?.(null, edge);
                    } else {
                        callbacksRef.current.onEdgeClick?.(edgeData.originalData, edge);
                    }
                }, 0);

                return newPinnedEdgeId;
            });
        });

        sigma.on('enterEdge', ({edge}) => {
            setHoveredEdgeId(edge);
        });

        sigma.on('leaveEdge', ({edge}) => {
            setHoveredEdgeId(null);
        });

        // Blank area click handled by native container listener above
        

        setIsInitialized(true);

        // Cleanup function
        return () => {
            // Clean native mousemove listener
            if (window._sigmaMouseMoveCleanup) {
                window._sigmaMouseMoveCleanup();
                delete window._sigmaMouseMoveCleanup;
            }

            if (sigmaRef.current) {
                try {
                    sigmaRef.current.removeAllListeners();
                    sigmaRef.current.kill();
                } catch (e) {
                    console.warn('Error cleaning sigma on unmount:', e);
                }
            }
            if (graphRef.current) {
                try {
                    graphRef.current.clear();
                } catch (e) {
                    console.warn('Error clearing graph on unmount:', e);
                }
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges]); 

    // Re-layout on tuning changes
    useEffect(() => {
        if (!sigmaRef.current || !graphRef.current || !isInitialized || !isMountedRef.current) {
            return;
        }

        try {
            const graph = graphRef.current;
            const sigma = sigmaRef.current;

            if (graph.nodes().length === 0) {
                return;
            }

            
            applyLayoutToGraph(graph, mergedLayoutOptions);

            // Refresh display
            sigma.refresh();

        } catch (error) {
            if (isMountedRef.current) {
                console.warn('Layout change failed:', error);
            }
        }
    }, [mergedLayoutOptions, isInitialized]); 

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            
            if (isMountedRef.current) {
                isMountedRef.current = false;
            }
            if (sigmaRef.current) {
                try {
                    sigmaRef.current.removeAllListeners();
                    sigmaRef.current.kill();
                    sigmaRef.current = null;
                } catch (e) {
                    console.warn('Error cleaning sigma:', e);
                }
            }
            if (graphRef.current) {
                try {
                    graphRef.current.clear();
                    graphRef.current = null;
                } catch (e) {
                    console.warn('Error clearing graph:', e);
                }
            }
        };
    }, []); 

    // Focus camera on a specific node
    const focusOnNode = useCallback((nodeId: string) => {
        if (!isMountedRef.current || !sigmaRef.current || !graphRef.current || !nodeId) {
            return false;
        }

        try {
            const graph = graphRef.current;
            const sigma = sigmaRef.current;
            const normalizedNodeId = String(nodeId);

            if (!graph.hasNode(normalizedNodeId)) {
                return false;
            }

            const camera = sigma.getCamera();

            // Get Sigma display position
            let nodeDisplayPosition;
            try {
                nodeDisplayPosition = sigma.getNodeDisplayData(normalizedNodeId);
                if (!nodeDisplayPosition || typeof nodeDisplayPosition.x !== 'number' || typeof nodeDisplayPosition.y !== 'number') {
                    // Fallback to graph data position
                    const nodePosition = graph.getNodeAttributes(normalizedNodeId);
                    nodeDisplayPosition = {x: nodePosition.x, y: nodePosition.y};
                }
            } catch (e) {
                // Fallback to graph data
                const nodePosition = graph.getNodeAttributes(normalizedNodeId);
                nodeDisplayPosition = {x: nodePosition.x, y: nodePosition.y};
            }

            if (!nodeDisplayPosition || typeof nodeDisplayPosition.x !== 'number' || typeof nodeDisplayPosition.y !== 'number') {
                return false;
            }

            // Animate to node position

            // Quadratic ease in-out
            const quadInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

            // Keep current zoom ratio
            const currentState = camera.getState();

            // Animate to node position
            camera.animate(
                {x: nodeDisplayPosition.x, y: nodeDisplayPosition.y, ratio: currentState.ratio},
                {duration: 600, easing: quadInOut}
            ).catch((error) => {
                if (isMountedRef.current) {
                    // On animation failure, set position directly
                    try {
                        if (isMountedRef.current && camera) {
                            camera.setState({
                                x: nodeDisplayPosition.x,
                                y: nodeDisplayPosition.y,
                                ratio: currentState.ratio
                            });
                        }
                    } catch (e) {
                        
                    }
                }
            });

            return true;
        } catch (error) {
            return false;
        }
    }, []);

    // Highlight node effect (deferred until Sigma ready)
    useEffect(() => {
        if (highlightedNodeId && isInitialized && isMountedRef.current) {
            // Use rAF to ensure DOM is ready
            const rafId = requestAnimationFrame(() => {
                if (isMountedRef.current && sigmaRef.current && graphRef.current) {
                    focusOnNode(highlightedNodeId);
                }
            });

            return () => cancelAnimationFrame(rafId);
        }
    }, [highlightedNodeId, isInitialized, focusOnNode]);

    // Sync external highlightedNodeId with internal pinnedNodeId:
    // clear pin when external highlight changes
    useEffect(() => {
        if (highlightedNodeId && pinnedNodeId && pinnedNodeId !== highlightedNodeId) {
            setPinnedNodeId(null);
        }
    }, [highlightedNodeId, pinnedNodeId]);

    // =====================================================
    // Visual effect handlers
    // =====================================================

    // Edge style computation for highlight logic
    const getEdgeStyle = useCallback((edge: string, data: Record<string, any>, graph: DirectedGraph, activeEdgeId: string | null, matchingIds: Set<string> | null = null) => {
        // Edge style in filter mode
        if (matchingIds) {
            try {
                const sourceNode = graph.source(edge);
                const targetNode = graph.target(edge);
                const sourceMatched = matchingIds.has(String(sourceNode));
                const targetMatched = matchingIds.has(String(targetNode));

                if (sourceMatched || targetMatched) {
                    return {
                        ...data,
                        zIndex: 2,
                        size: Math.max(data.size * 1.5, 1),
                        color: data.color,
                        forceLabel: true,
                        label: getStringOrEmpty(data.label) 
                    };
                }

                return {
                    ...data,
                    color: EDGE_FADE_COLOR,
                    size: Math.max(data.size * 0.4, 0.3),
                    zIndex: 0,
                    label: '' 
                };
            } catch (e) {
                return data;
            }
        }

        
        return {
            ...data,
            label: getStringOrEmpty(data.label) 
        };
    }, []);

    // Filter mode: highlight matched nodes and their edges
    const applyFilterHighlight = useCallback((sigma: Sigma, graph: DirectedGraph, matchingIds: Set<string>) => {
        const stringMatchingIds = new Set([...matchingIds].map(id => String(id)));

        sigma.setSetting('nodeReducer', (node, data) => {
            const isMatched = stringMatchingIds.has(String(node));

            if (isMatched) {
                // Matched node: original color + white border
                return {
                    ...data,
                    zIndex: 2,
                    color: data.color,
                    borderColor: '#ffffff',
                    borderSize: 3,
                    forceLabel: true,
                };
            }

            // Check if connected to a matched node
            let isConnected = false;
            try {
                for (const matchedNodeId of stringMatchingIds) {
                    if (graph.hasEdge(node, matchedNodeId) || graph.hasEdge(matchedNodeId, node)) {
                        isConnected = true;
                        break;
                    }
                }
            } catch (e) {
                
            }

            if (isConnected) {
                // Connected node: slightly smaller
                return {
                    ...data,
                    zIndex: 1,
                    size: data.size * 0.9,
                    color: data.color,
                    forceLabel: true,
                };
            }

            // Unrelated node: fade and hide label
            return {
                ...data,
                zIndex: 0,
                color: NODE_FADE_COLOR,
                size: data.size * 0.6,
                label: '',
            };
        });

        sigma.setSetting('edgeReducer', (edge, data) =>
            getEdgeStyle(edge, data, graph, null, stringMatchingIds)
        );
    }, [getEdgeStyle]);

    // Single node highlight: target node and connected edges
    const applySingleNodeHighlight = useCallback((sigma: Sigma, graph: DirectedGraph, activeNodeId: string) => {
        const activeColor = graph.getNodeAttribute(String(activeNodeId), 'color');

        sigma.setSetting('nodeReducer', (node, data) => {
            if (node === String(activeNodeId)) {
                // Target node: original color + white border
                return {
                    ...data,
                    zIndex: 1,
                    color: activeColor,
                    borderColor: '#ffffff',
                    borderSize: 3,
                };
            }

            // Connected node: keep original color
            if (graph.hasEdge(node, String(activeNodeId)) || graph.hasEdge(String(activeNodeId), node)) {
                return {...data, zIndex: 1};
            }

            // Unrelated node: fade and hide label
            return {
                ...data,
                zIndex: 0,
                label: '',
                color: NODE_FADE_COLOR,
                size: data.size * 0.6,
            };
        });

        sigma.setSetting('edgeReducer', (edge, data) => {
            try {
                // Connected edge: keep color, enlarge
                if (graph.hasExtremity(edge, String(activeNodeId))) {
                    return {
                        ...data,
                        color: data.color,
                        size: Math.max(data.size * 2, 1.5),
                        zIndex: 2
                    };
                }

                // Unrelated edge: fade
                return {
                    ...data,
                    color: EDGE_FADE_COLOR,
                    size: Math.max(data.size * 0.5, 0.4),
                    zIndex: 0
                };
            } catch (e) {
                return data;
            }
        });
    }, []);

    // Edge highlight: target edge and endpoint nodes
    const applyEdgeHoverHighlight = useCallback((sigma: Sigma, graph: DirectedGraph, activeEdgeId: string) => {
        // Get edge endpoints
        let sourceNode = null;
        let targetNode = null;
        let edgeData = null;
        try {
            sourceNode = graph.source(activeEdgeId);
            targetNode = graph.target(activeEdgeId);
            edgeData = graph.getEdgeAttributes(activeEdgeId);
        } catch (e) {
            
            return;
        }

        // Use stored tooltip data or rebuild
        let tooltipData = edgeData?._tooltipData;
        if (!tooltipData) {
            // Get source/target node info
            const sourceNodeData = graph.getNodeAttributes(sourceNode);
            const targetNodeData = graph.getNodeAttributes(targetNode);
            const edgeType = typeof edgeData?.relationshipType === 'string' ? edgeData.relationshipType : null;
            const sourceName = typeof sourceNodeData?.label === 'string' ? sourceNodeData.label : null;
            const targetName = typeof targetNodeData?.label === 'string' ? targetNodeData.label : null;
            if (!edgeType || !sourceName || !targetName) {
                return;
            }

            // Build tooltip data
            tooltipData = {
                edgeType,
                sourceName,
                targetName,
                weight: edgeData?.weight,
                edgeData: edgeData,
                sourceNodeData: sourceNodeData,
                targetNodeData: targetNodeData
            };
        }

        // Generate label via custom or default renderer
        const detailedLabel = edgeTooltipRenderer
            // @ts-ignore
            ? edgeTooltipRenderer(tooltipData, 'hover')
            : createDefaultEdgeTooltip(tooltipData, 'hover');

        sigma.setSetting('nodeReducer', (node, data) => {
            // Endpoint node: orange border
            if (node === sourceNode || node === targetNode) {
                return {
                    ...data,
                    zIndex: 3,
                    borderColor: '#ff6b35',
                    borderSize: 3,
                };
            }

            // Unrelated node: fade and hide label
            return {
                ...data,
                zIndex: 0,
                label: '',
                color: NODE_FADE_COLOR,
                size: data.size * 0.6
            };
        });

        sigma.setSetting('edgeReducer', (edge, data) => {
            // Target edge: keep color, enlarge, show detailed label
            if (edge === activeEdgeId) {
                return {
                    ...data,
                    size: Math.max(data.size * 2.5, 2),
                    color: data.color,
                    zIndex: 10,
                    label: detailedLabel,
                    sourceName: data.sourceName,
                    targetName: data.targetName,
                    relationshipType: data.relationshipType,
                    weight: data.weight,
                    _isHovered: true
                };
            }

            // Unrelated edge: fade and hide label
            return {
                ...data,
                color: EDGE_FADE_COLOR,
                size: Math.max(data.size * 0.4, 0.3),
                zIndex: 0,
                label: '',
                _isHovered: false
            };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [edgeTooltipRenderer]);

    // Unified visual effects with priority system
    useEffect(() => {
        if (!sigmaRef.current || !graphRef.current || !isInitialized) return;

        const graph = graphRef.current;
        const sigma = sigmaRef.current;

        // Priority: filter > node highlight > edge highlight > default
        if (matchingNodeIds.size > 0) {
            // 1. Filter mode: highest priority
            applyFilterHighlight(sigma, graph, matchingNodeIds);
        } else {
            // 2. Node highlight: pinned > hover > highlight
            const activeNodeId = pickFirstDefined(pinnedNodeId, hoveredNodeId, highlightedNodeId);

            // 3. Edge highlight: pinned > hover
            const activeEdgeId = pickFirstDefined(pinnedEdgeId, hoveredEdgeId);

            if (activeNodeId && graph.hasNode(String(activeNodeId))) {
                // Node highlight takes priority over edge
                applySingleNodeHighlight(sigma, graph, activeNodeId);
            } else if (activeEdgeId && graph.hasEdge(activeEdgeId)) {
                // Apply edge highlight only when no node is highlighted
                applyEdgeHoverHighlight(sigma, graph, activeEdgeId);
            } else {
                // Clear all highlights
                sigma.setSetting('nodeReducer', null);
                sigma.setSetting('edgeReducer', null);
            }
        }

        // Refresh render
        try {
            sigma.refresh({skipIndexation: true});
        } catch (error) {
            try {
                sigma.refresh();
            } catch (fullError) {
                console.error('Sigma refresh failed:', fullError);
            }
        }
    }, [
        // State deps
        hoveredNodeId, selectedNodeId, highlightedNodeId,
        pinnedNodeId, pinnedEdgeId, matchingNodeIds, hoveredEdgeId,
        // System deps
        isInitialized,
        // Function deps
        applyFilterHighlight, applySingleNodeHighlight, applyEdgeHoverHighlight, getEdgeStyle
    ]);

    // Controls
    const controls = {
        // @ts-ignore
        zoomIn: () => sigmaRef.current?.getCamera().animatedZoom(1.5, {duration: 300}),
        // @ts-ignore
        zoomOut: () => sigmaRef.current?.getCamera().animatedUnzoom(1.5, {duration: 300}),
        resetView: () => sigmaRef.current?.getCamera().animatedReset(),
        relayout: () => {
            const graph = graphRef.current;
            if (graph && graph.nodes().length > 0) {
                circular.assign(graph);
                sigmaRef.current?.refresh();
            }
        }
    };

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 ${className}`} style={{height}}>
                <div className="text-center">
                    <Network className="w-12 h-12 text-red-500 mx-auto mb-2"/>
                    <p className="text-sm text-red-600 mb-1">Graph render failed</p>
                    <p className="text-xs text-gray-500 max-w-xs">{error}</p>
                </div>
            </div>
        );
    }

    if (nodes.length === 0) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 ${className}`} style={{height}}>
                <div className="text-center">
                    <Network className="w-16 h-16 text-gray-400 mx-auto mb-2"/>
                    <p className="text-sm text-gray-600">No graph data</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative bg-white ${className}`} style={{height}}>
            <div
                ref={containerRef}
                className="w-full h-full"
                style={{
                    height: height,
                    width: '100%',
                    minHeight: '300px', 
                    position: 'relative'
                }}
            />

            {/* Controls - demo style */}
            <div className="absolute bottom-2 left-2">
                <div className="flex flex-col gap-1">
                    {[
                        {icon: ZoomIn, action: controls.zoomIn, title: "Zoom in"},
                        {icon: ZoomOut, action: controls.zoomOut, title: "Zoom out"},
                        {icon: Home, action: controls.resetView, title: "Reset view"},
                        {icon: RotateCcw, action: controls.relayout, title: "Re-layout"}
                    ].map(({icon: Icon, action, title}, index) => (
                        <div key={index} className="bg-white rounded shadow-lg">
                            <button
                                onClick={action}
                                className="block relative w-8 h-8 rounded border-none outline-none text-black bg-white cursor-pointer hover:text-gray-600 transition-colors"
                                title={title}
                                aria-label={title}
                            >
                                <Icon
                                    className="absolute inset-0 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ForceAtlas2 tuning panel */}
            <div className="absolute bottom-2 right-2">
                <div className="bg-white/95 backdrop-blur rounded shadow-lg p-2 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Force Layout</span>
                        <button
                            className="text-xs text-blue-600 hover:underline"
                            onClick={() => setShowTuning(!showTuning)}
                        >{showTuning ? 'Hide' : 'Show'}</button>
                    </div>
                    {showTuning && (
                        <div className="grid grid-cols-2 gap-2 w-72">
                            <label className="col-span-2 flex items-center gap-2 text-xs text-gray-600">
                                <input type="checkbox" checked={fa2Tuning.enabled}
                                       onChange={(e) => setFa2Tuning(v => ({...v, enabled: e.target.checked}))}/>
                                Live
                            </label>
                            <div className="col-span-2">
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Iterations</span><span>{fa2Tuning.iterations}</span>
                                </div>
                                <input key="iterations-range" type="range" min="120" max="1000" value={fa2Tuning.iterations}
                                       onChange={(e) => setFa2Tuning(v => ({
                                           ...v,
                                           iterations: Number(e.target.value)
                                       }))}/>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Gravity</span><span>{fa2Tuning.gravity.toFixed(2)}</span>
                                </div>
                                <input key="gravity-range" type="range" min="0" max="0.3" step="0.01" value={fa2Tuning.gravity}
                                       onChange={(e) => setFa2Tuning(v => ({...v, gravity: Number(e.target.value)}))}/>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Scaling</span><span>{fa2Tuning.scalingRatio}</span>
                                </div>
                                <input key="scaling-range" type="range" min="4" max="40" step="1" value={fa2Tuning.scalingRatio}
                                       onChange={(e) => setFa2Tuning(v => ({
                                           ...v,
                                           scalingRatio: Number(e.target.value)
                                       }))}/>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>EdgeWeight</span><span>{fa2Tuning.edgeWeightInfluence.toFixed(2)}</span>
                                </div>
                                <input key="edgeweight-range" type="range" min="0" max="1" step="0.05" value={fa2Tuning.edgeWeightInfluence}
                                       onChange={(e) => setFa2Tuning(v => ({
                                           ...v,
                                           edgeWeightInfluence: Number(e.target.value)
                                       }))}/>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>SlowDown</span><span>{fa2Tuning.slowDown.toFixed(1)}</span>
                                </div>
                                <input key="slowdown-range" type="range" min="0.6" max="5" step="0.1" value={fa2Tuning.slowDown}
                                       onChange={(e) => setFa2Tuning(v => ({...v, slowDown: Number(e.target.value)}))}/>
                            </div>
                            <label key="linlog-checkbox" className="flex items-center gap-2 text-xs text-gray-600">
                                <input type="checkbox" checked={fa2Tuning.linLogMode}
                                       onChange={(e) => setFa2Tuning(v => ({...v, linLogMode: e.target.checked}))}/>
                                linLog
                            </label>
                            <label key="stronggravity-checkbox" className="flex items-center gap-2 text-xs text-gray-600">
                                <input type="checkbox" checked={fa2Tuning.strongGravityMode}
                                       onChange={(e) => setFa2Tuning(v => ({
                                           ...v,
                                           strongGravityMode: e.target.checked
                                       }))}/>
                                strongGravity
                            </label>
                            <label key="outbound-checkbox" className="flex items-center gap-2 text-xs text-gray-600">
                                <input type="checkbox" checked={fa2Tuning.outboundAttractionDistribution}
                                       onChange={(e) => setFa2Tuning(v => ({
                                           ...v,
                                           outboundAttractionDistribution: e.target.checked
                                       }))}/>
                                outboundAttraction
                            </label>
                            <div>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Theta</span><span>{fa2Tuning.barnesHutTheta.toFixed(1)}</span>
                                </div>
                                <input key="theta-range" type="range" min="0.4" max="1.2" step="0.1" value={fa2Tuning.barnesHutTheta}
                                       onChange={(e) => setFa2Tuning(v => ({
                                           ...v,
                                           barnesHutTheta: Number(e.target.value)
                                       }))}/>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading indicator */}
            {!isInitialized && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-violet-500"/>
                        <span className="text-sm text-gray-600">Loading...</span>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SigmaGraph;
