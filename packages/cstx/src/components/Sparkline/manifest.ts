import type { ComponentManifest } from '../../types/manifest';

export const sparklineManifest: ComponentManifest = {
  type: 'sparkline',
  displayName: 'Sparkline',
  description: 'Minimal inline SVG sparkline chart for trend indication. No external chart library needed.',
  span: { minCols: 1, maxCols: 2, defaultCols: 1 },
  dataSlots: [
    { key: 'values', label: 'Data points', shape: 'array', required: true, typeHint: 'number[]', example: [10, 15, 8, 22, 18] },
  ],
  propSlots: [
    { key: 'color', label: 'Line color', type: 'string', default: '#3b82f6' },
    { key: 'height', label: 'Chart height (px)', type: 'number', default: 40 },
    { key: 'strokeWidth', label: 'Line width', type: 'number', default: 1.5 },
    { key: 'showEndDot', label: 'Show dot at end', type: 'boolean', default: true },
    { key: 'title', label: 'Label text', type: 'string', default: '' },
  ],
  tags: ['chart', 'sparkline', 'trend', 'inline'],
};
