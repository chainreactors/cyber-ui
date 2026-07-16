import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { RuntimeComponentProps } from '../../runtime/registry';

interface Breadcrumb {
  label: string;
  href?: string;
}

export function PageHeader({ config }: RuntimeComponentProps): React.JSX.Element {
  const title = config.title as string;
  const titleVisible = config.titleVisible !== false;
  const subtitle = config.subtitle as string;
  const breadcrumbs = (config.breadcrumbs ?? []) as Breadcrumb[];

  return (
    <div className="mb-2">
      {breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              {crumb.href && i < breadcrumbs.length - 1 ? (
                <a
                  href={crumb.href}
                  className="hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {crumb.label}
                </a>
              ) : (
                <span
                  className={
                    i === breadcrumbs.length - 1
                      ? 'font-medium text-slate-700 dark:text-slate-200'
                      : ''
                  }
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      {titleVisible && (
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      )}
      {subtitle && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
