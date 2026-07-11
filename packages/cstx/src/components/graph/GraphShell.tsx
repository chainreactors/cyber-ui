import React from 'react';
import { cn } from '../../lib/cn';

export interface GraphShellProps {
    className?: string;
    toolbar: React.ReactNode;
    statisticsPanel?: React.ReactNode;
    queryPanel?: React.ReactNode;
    children: React.ReactNode;
}

export function GraphShell({
    className,
    toolbar,
    statisticsPanel,
    queryPanel,
    children,
}: GraphShellProps): React.JSX.Element {
    return (
        <div className={cn('flex h-screen min-h-0 flex-col overflow-hidden', className)}>
            <div className="flex flex-1 flex-col min-h-0">
                {toolbar}
                {statisticsPanel}
                {queryPanel}
                {children}
            </div>
        </div>
    );
}
