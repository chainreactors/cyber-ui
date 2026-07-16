export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info', 'unknown'] as const;

export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#e11d48', high: '#f97316', medium: '#eab308',
  low: '#06b6d4', info: '#8b5cf6', unknown: '#6b7280',
};

export const TYPE_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#0891b2', '#e11d48', '#4f46e5', '#059669', '#ca8a04',
];
