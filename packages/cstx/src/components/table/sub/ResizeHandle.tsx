import React from 'react';
import { cn } from '../../../lib/cn';

export interface ResizeHandleProps {
  columnId: string;
  isResizing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ResizeHandle({ columnId, isResizing, onMouseDown }: ResizeHandleProps) {
  return (
    <div
      data-column={columnId}
      onMouseDown={onMouseDown}
      className={cn(
        'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none',
        'hover:bg-blue-400/50 active:bg-blue-500/70',
        isResizing && 'bg-blue-500/70',
      )}
    />
  );
}
