import React from 'react';
import { cn } from '../../lib/cn';
import { DataState } from './DataState';

export interface ItemListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  maxHeight?: string;
  maxItems?: number;
  loading?: boolean;
  loadingText?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyText?: string;
  emptyHint?: string;
  className?: string;
}

export function ItemList<T>({
  items,
  renderItem,
  maxHeight = 'max-h-60',
  maxItems,
  loading = false,
  loadingText,
  emptyIcon,
  emptyText = 'No data',
  emptyHint,
  className,
}: ItemListProps<T>): React.JSX.Element {
  if (loading) return <DataState loading loadingText={loadingText} />;
  if (items.length === 0) return <DataState empty icon={emptyIcon} emptyText={emptyText} emptyHint={emptyHint} />;

  const displayItems = maxItems ? items.slice(0, maxItems) : items;
  const hasMore = maxItems && items.length > maxItems;

  return (
    <div className={cn('space-y-2 overflow-y-auto', maxHeight, className)}>
      {displayItems.map((item, index) => renderItem(item, index))}
      {hasMore && (
        <p className="py-2 text-center text-xs text-slate-500">
          还有 {items.length - maxItems!} 项...
        </p>
      )}
    </div>
  );
}
