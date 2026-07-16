import type { ComponentManifest } from '../../types/manifest';

export const distributionBarManifest: ComponentManifest = {
  type: 'distribution-bar',
  displayName: 'Distribution Bar',
  description: 'Horizontal bar chart showing value distribution with percentage labels. Pure CSS, no chart library.',
  span: { minCols: 2, maxCols: 4, defaultCols: 2 },
  dataSlots: [
    { key: 'items', label: 'Distribution items', shape: 'array', required: true, typeHint: '{label: string, value: number}[]' },
  ],
  propSlots: [
    { key: 'title', label: 'Chart title', type: 'string', default: '' },
    { key: 'maxItems', label: 'Max items to show', type: 'number', default: 10 },
    { key: 'showPercentage', label: 'Show percentage', type: 'boolean', default: true },
    { key: 'showValue', label: 'Show raw value', type: 'boolean', default: true },
  ],
  tags: ['chart', 'bar', 'distribution', 'horizontal'],
};
