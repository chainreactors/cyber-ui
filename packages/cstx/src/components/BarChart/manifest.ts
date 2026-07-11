import type { ComponentManifest } from '../../types/manifest';

export const barChartManifest: ComponentManifest = {
  type: 'bar-chart',
  displayName: 'Bar Chart',
  description: 'Vertical bar chart for comparing categorical values.',
  span: { minCols: 2, maxCols: 4, defaultCols: 2 },
  dataSlots: [
    {
      key: 'items',
      label: 'Data points',
      shape: 'array',
      required: true,
    },
  ],
  propSlots: [
    {
      key: 'title',
      label: 'Chart title',
      type: 'string',
      required: true,
      description: 'Title displayed above the chart',
    },
    {
      key: 'color',
      label: 'Bar color',
      type: 'string',
      default: '#10b981',
    },
    {
      key: 'height',
      label: 'Chart height (px)',
      type: 'number',
      default: 200,
    },
  ],
  tags: ['chart', 'bar', 'comparison', 'categorical'],
};
