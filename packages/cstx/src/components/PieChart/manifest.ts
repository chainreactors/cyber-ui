import type { ComponentManifest } from '../../types/manifest';

export const pieChartManifest: ComponentManifest = {
  type: 'pie-chart',
  displayName: 'Pie Chart',
  description: 'Pie or donut chart for showing proportional distribution.',
  span: { minCols: 1, maxCols: 4, defaultCols: 2 },
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
      key: 'isDonut',
      label: 'Donut mode',
      type: 'boolean',
      default: false,
    },
    {
      key: 'height',
      label: 'Chart height (px)',
      type: 'number',
      default: 240,
    },
  ],
  tags: ['chart', 'pie', 'donut', 'distribution', 'proportion'],
};
