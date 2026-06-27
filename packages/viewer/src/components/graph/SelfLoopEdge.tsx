/**
 * Custom edge components for cyclic graphs.
 *
 * - SelfLoopEdge: node → itself (arc on the right side)
 * - BackEdge: target is above source in layout (curved path going upward)
 */

import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'

/** Self-loop: arc from right side back to top of the same node. */
export function SelfLoopEdge({
  sourceX,
  sourceY,
  label,
  labelStyle,
  labelBgStyle,
  markerEnd,
  style,
}: EdgeProps) {
  const loopWidth = 50
  const loopHeight = 60

  const path = [
    `M ${sourceX} ${sourceY}`,
    `C ${sourceX + loopWidth} ${sourceY},`,
    `  ${sourceX + loopWidth} ${sourceY - loopHeight},`,
    `  ${sourceX} ${sourceY - loopHeight}`,
  ].join(' ')

  const labelX = sourceX + loopWidth * 0.65
  const labelY = sourceY - loopHeight * 0.5

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              fontSize: 11,
              fontWeight: 600,
              color: '#8b5cf6',
              background: 'var(--xy-background-color, #fff)',
              borderRadius: 4,
              padding: '1px 5px',
              ...labelStyle,
              ...labelBgStyle,
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

/** Back-edge: source is below target in layout — draw a wide curve to the right. */
export function BackEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  labelStyle,
  labelBgStyle,
  markerEnd,
  style,
}: EdgeProps) {
  // Offset to the right so the back-edge doesn't overlap forward edges
  const offsetX = Math.max(80, Math.abs(sourceX - targetX) * 0.4 + 60)

  const midY = (sourceY + targetY) / 2

  const path = [
    `M ${sourceX} ${sourceY}`,
    `C ${sourceX + offsetX} ${sourceY},`,
    `  ${targetX + offsetX} ${targetY},`,
    `  ${targetX} ${targetY}`,
  ].join(' ')

  const labelPosX = Math.max(sourceX, targetX) + offsetX * 0.6
  const labelPosY = midY

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelPosX}px, ${labelPosY}px)`,
              pointerEvents: 'none',
              fontSize: 11,
              fontWeight: 600,
              color: '#8b5cf6',
              background: 'var(--xy-background-color, #fff)',
              borderRadius: 4,
              padding: '1px 5px',
              ...labelStyle,
              ...labelBgStyle,
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
