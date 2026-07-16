import type { ComponentManifest } from '../../types/manifest';

export const statCardManifest: ComponentManifest = {
  type: 'stat-card',
  displayName: 'Stat Card',
  description:
    'Single-metric card showing a value with optional trend indicator and description.',
  span: { minCols: 1, maxCols: 2, defaultCols: 1 },
  dataSlots: [
    {
      key: 'metric',
      label: 'Metric value',
      shape: 'scalar',
      required: true,
      typeHint: 'string | number',
      example: 1247,
    },
  ],
  propSlots: [
    {
      key: 'title',
      label: 'Card title',
      type: 'string',
      required: true,
      description: 'Label displayed above the metric value',
    },
    {
      key: 'description',
      label: 'Description text',
      type: 'string',
      default: '',
    },
    {
      key: 'tone',
      label: 'Color tone',
      type: 'enum',
      options: [
        'slate',
        'blue',
        'emerald',
        'amber',
        'rose',
        'violet',
        'cyan',
        'teal',
        'orange',
      ],
      default: 'slate',
    },
    {
      key: 'icon',
      label: 'Icon name (lucide)',
      type: 'string',
      default: '',
      description: 'Name of a lucide-react icon, e.g. "Server", "Shield"',
    },
    {
      key: 'change',
      label: 'Change indicator text',
      type: 'string',
      default: '',
    },
    {
      key: 'changeType',
      label: 'Change sentiment',
      type: 'enum',
      options: ['positive', 'negative', 'neutral'],
      default: 'neutral',
    },
  ],
  tags: ['metric', 'stat', 'card', 'kpi'],
};
