import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@aspect/theme'

export interface CollapsibleProps {
  title: string
  defaultExpanded?: boolean
  expanded?: boolean
  onToggle?: (expanded: boolean) => void
  className?: string
  headerClassName?: string
  bodyClassName?: string
  children: ReactNode
}

export function Collapsible({
  title,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  className,
  headerClassName,
  bodyClassName,
  children,
}: CollapsibleProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isExpanded = controlledExpanded ?? internalExpanded

  const toggle = () => {
    const next = !isExpanded
    if (controlledExpanded === undefined) setInternalExpanded(next)
    onToggle?.(next)
  }

  const Chevron = isExpanded ? ChevronDown : ChevronRight

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={toggle}
        className={cn(
          'flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/40',
          headerClassName,
        )}
      >
        <Chevron className="h-3 w-3 shrink-0" />
        <span className="truncate">{title}</span>
      </button>
      {isExpanded && (
        <div className={cn('px-3 pb-2', bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  )
}
