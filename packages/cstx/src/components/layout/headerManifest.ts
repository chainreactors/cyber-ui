import type { ComponentManifest } from '../../types/manifest';

export const pageHeaderManifest: ComponentManifest = {
  type: 'page-header',
  displayName: 'Page Header',
  description:
    'Page title with optional subtitle and breadcrumb trail. Always spans full width.',
  span: { minCols: 4, maxCols: 4, defaultCols: 4 },
  dataSlots: [],
  propSlots: [
    {
      key: 'title',
      label: 'Page title',
      type: 'string',
      required: true,
    },
    {
      key: 'subtitle',
      label: 'Subtitle text',
      type: 'string',
      default: '',
    },
    {
      key: 'breadcrumbs',
      label: 'Breadcrumb trail',
      type: 'object',
      default: [],
      description: 'Array of { label, href? }. Last item is current page.',
    },
  ],
  tags: ['header', 'title', 'breadcrumb', 'navigation'],
};
