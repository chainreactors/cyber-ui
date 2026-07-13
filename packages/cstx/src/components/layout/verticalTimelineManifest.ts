import type { ComponentManifest } from '../../types/manifest';

export const verticalTimelineManifest: ComponentManifest = {
  type: 'vertical-timeline',
  displayName: 'Vertical Timeline',
  description:
    'Vertical timeline with colored dots, timestamps, and content blocks. Suitable for change history, audit logs, and event sequences.',
  span: { minCols: 2, maxCols: 4, defaultCols: 2 },
  dataSlots: [
    {
      key: 'entries',
      label: 'Timeline entries',
      shape: 'array',
      required: true,
      typeHint: 'TimelineEntry[]',
      example: [
        {
          id: '1',
          timestamp: 1720000000,
          label: 'Node added',
          kind: 'added',
        },
      ],
    },
  ],
  propSlots: [
    {
      key: 'title',
      label: 'Timeline title',
      type: 'string',
      default: '',
    },
    {
      key: 'maxItems',
      label: 'Max entries to display',
      type: 'number',
      default: 50,
    },
    {
      key: 'emptyText',
      label: 'Empty state text',
      type: 'string',
      default: 'No events',
    },
    {
      key: 'kindColors',
      label: 'Kind-to-color mapping override',
      type: 'object',
      description:
        'Map of kind string to Tailwind color class. Defaults: added=emerald, updated=blue, removed=red, default=slate.',
    },
  ],
  tags: ['timeline', 'history', 'events', 'changelog', 'audit'],
};
