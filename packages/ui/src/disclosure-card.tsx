import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@cyber/theme'

export interface DisclosureCardProps {
  /**
   * Header content between the left edge and the trailing chevron — the leading
   * glyph, title, pills and any status icon. The chevron is owned by the card;
   * the header is laid out in a `flex-1 min-w-0` row, so a `flex-1 truncate`
   * middle element and an `ml-auto` trailing element behave as expected.
   */
  header: ReactNode
  defaultExpanded?: boolean
  /** Controlled expansion; pair with `onToggle`. */
  expanded?: boolean
  onToggle?: (expanded: boolean) => void
  /**
   * Body reveal style:
   *  - `false` (default): body mounts only when expanded; `collapsedPreview`
   *    (if any) takes its place when collapsed.
   *  - `true`: body stays mounted and animates open/closed via a `grid-rows`
   *    transition — use when the body owns a ref / scroll position that must
   *    survive a collapse (e.g. a streaming log pinned to the bottom).
   */
  animated?: boolean
  /** Shown in place of the body when collapsed and not `animated`. */
  collapsedPreview?: ReactNode
  className?: string
  headerClassName?: string
  bodyClassName?: string
  children: ReactNode
}

/**
 * A bordered card whose header row toggles a collapsible body — the shared
 * skeleton behind the scan-progress, tool-call, code-call and attachment cards.
 * Owns the header `<button>` chrome (flex row, hover, `aria-expanded`) and the
 * chevron; callers supply tone/shadow/fill via `className`/`headerClassName`
 * and the rich header content via `header`. The two body modes (`animated`)
 * cover both the grid-animated streaming logs and the collapsed-preview /
 * expanded-full tool panels, so those hand-rolled cards collapse to one atom.
 *
 * Unlike `Collapsible` (a plain string-titled section), this carries a card
 * shell + arbitrary header node + an animated body — the reason those tool /
 * progress cards couldn't use `Collapsible`.
 */
export function DisclosureCard({
  header,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  animated = false,
  collapsedPreview,
  className,
  headerClassName,
  bodyClassName,
  children,
}: DisclosureCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isExpanded = controlledExpanded ?? internalExpanded

  const toggle = () => {
    const next = !isExpanded
    if (controlledExpanded === undefined) setInternalExpanded(next)
    onToggle?.(next)
  }

  const Chevron = isExpanded ? ChevronDown : ChevronRight

  return (
    <div className={cn('overflow-hidden rounded-lg border', className)}>
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={toggle}
        className={cn(
          'flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent/50',
          headerClassName,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">{header}</span>
        <Chevron className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>

      {animated ? (
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-in-out',
            isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className={cn('overflow-hidden', bodyClassName)}>{children}</div>
        </div>
      ) : isExpanded ? (
        <div className={bodyClassName}>{children}</div>
      ) : (
        (collapsedPreview ?? null)
      )}
    </div>
  )
}
