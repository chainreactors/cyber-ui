import React from 'react';
import type { PerspectiveConfig } from '../types/perspective';
import { GridLayout } from './GridLayout';
import { cn } from '../lib/cn';

export interface PerspectiveShellProps {
  config: PerspectiveConfig;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onAction?: (cellId: string, action: string, payload?: Record<string, unknown>) => void;
}

export function PerspectiveShell({
  config,
  className,
  header,
  footer,
  onAction,
}: PerspectiveShellProps): React.JSX.Element {
  return (
    <div className={cn('flex h-full flex-col overflow-auto', className)}>
      {header}
      <div className="flex-1 px-4 py-4 sm:px-6">
        <GridLayout
          sections={config.sections}
          variables={config.variables as Record<string, unknown>}
          onAction={onAction}
        />
      </div>
      {footer}
    </div>
  );
}
