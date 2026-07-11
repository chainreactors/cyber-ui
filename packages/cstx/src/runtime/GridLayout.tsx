import React from 'react';
import type { LayoutSection, CellConfig } from '../types/perspective';
import type { ComponentManifest } from '../types/manifest';
import { cn } from '../lib/cn';
import { useCstxUi } from './CstxUiProvider';
import { DataResolver } from './DataResolver';

export interface GridLayoutProps {
  sections: LayoutSection[];
  variables?: Record<string, unknown>;
  className?: string;
  onAction?: (cellId: string, action: string, payload?: Record<string, unknown>) => void;
}

const GAP_CLASSES = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
} as const;

function resolveColSpan(
  cell: CellConfig,
  manifest: ComponentManifest | undefined,
): number {
  const constraint = manifest?.span;
  if (!constraint) return cell.colSpan ?? 1;
  const requested = cell.colSpan ?? constraint.defaultCols;
  return Math.max(constraint.minCols, Math.min(constraint.maxCols, requested));
}

export function GridLayout({
  sections,
  variables,
  className,
  onAction,
}: GridLayoutProps): React.JSX.Element {
  const { registry } = useCstxUi();

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {sections.map((section, sIdx) => (
        <div key={section.id ?? sIdx}>
          {section.title && (
            <h2 className="mb-3 text-lg font-semibold">{section.title}</h2>
          )}
          <div
            className={cn(
              'grid min-w-0 grid-cols-4',
              GAP_CLASSES[section.gap ?? 'md'],
            )}
          >
            {section.cells.map((cell) => {
              const manifest = registry.getManifest(cell.component);
              const colSpan = resolveColSpan(cell, manifest);
              return (
                <div
                  key={cell.id}
                  className="min-w-0"
                  style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
                >
                  <DataResolver
                    cell={cell}
                    colSpan={colSpan}
                    variables={variables as Record<string, unknown>}
                    onAction={onAction}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
