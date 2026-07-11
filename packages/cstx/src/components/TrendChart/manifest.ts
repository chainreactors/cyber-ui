import type { ComponentManifest } from '../../types/manifest';

export const trendChartManifest: ComponentManifest = {
  type: 'trend-chart',
  displayName: 'Trend Chart',
  description: 'Time-series line or area chart for showing trends over time.',
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
      label: 'Line/area color',
      type: 'string',
      default: '#3b82f6',
    },
    {
      key: 'showArea',
      label: 'Show as area chart',
      type: 'boolean',
      default: true,
    },
    {
      key: 'height',
      label: 'Chart height (px)',
      type: 'number',
      default: 200,
    },
  ],
  tags: ['chart', 'trend', 'line', 'area', 'time-series'],
};
