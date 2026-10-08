import { type ReactNode } from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@cyber/theme'
import { Collapsible } from '@cyber/ui'
import type { MessageBubbleVariant } from './MessageBubble'
import { StreamingCursor } from './MessageBubble'
import { ThinkingDots } from './ChatThinking'
import { AgentVoiceCard } from './AgentVoiceCard'

export interface AssistantResponseProps {
  /** Ordered inner steps, rendered inside the existing turn shell. */
  children?: ReactNode
  /** Render only a step's sections when its turn already owns the shell. */
  embedded?: boolean
  actorName?: string | null
  timestamp?: string
  thinking?: ReactNode
  thinkingExpanded?: boolean
  onThinkingToggle?: (expanded: boolean) => void
  tools?: ReactNode
  toolsExpanded?: boolean
  onToolsToggle?: (expanded: boolean) => void
  response?: ReactNode
  /** Optional host-owned annotation below the completed response. */
  footer?: ReactNode
  streaming?: boolean
  defaultThinkingExpanded?: boolean
  className?: string
  headerClassName?: string
  timeLabel?: string
  showResponseLabel?: boolean
  variant?: MessageBubbleVariant
  labels?: {
    thinking?: string
    tools?: ReactNode
    response?: string
    assistant?: string
  }
}

export default function AssistantResponse({
  children,
  embedded = false,
  actorName,
  className,
  defaultThinkingExpanded = false,
  headerClassName,
  labels,
  onThinkingToggle,
  response,
  footer,
  showResponseLabel = true,
  streaming,
  thinking,
  thinkingExpanded,
  timestamp,
  timeLabel,
  tools,
  toolsExpanded,
  onToolsToggle,
  variant = 'bubble',
}: AssistantResponseProps) {
  const time = timeLabel ?? (timestamp ? new Date(timestamp).toLocaleTimeString() : '')
  const hasThinking = hasContent(thinking)
  const hasTools = hasContent(tools)
  const hasResponse = hasContent(response)
  const showResponse = hasResponse || !!streaming

  // Order: thinking -> tools -> response. The written answer is the turn's
  // conclusion and must render last so it sits at the bottom of the card, where
  // the transcript's sticky scroll keeps it in view as it streams and once the
  // turn settles. (Tools above it stay collapsed, so they never push the report
  // off-screen.)
  const sections = children ?? (
    <>
      {hasThinking && (
        <Collapsible
          title={labels?.thinking || 'Thinking'}
          defaultExpanded={defaultThinkingExpanded}
          expanded={thinkingExpanded}
          onToggle={onThinkingToggle}
          className={cn(!showResponse && !hasTools ? '' : 'border-b border-border')}
          bodyClassName="text-sm leading-relaxed text-muted-foreground"
        >
          <div role="region" aria-label={labels?.thinking || 'Thinking'} tabIndex={0}
            className="max-h-64 overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">{thinking}</div>
        </Collapsible>
      )}
      {hasTools && (
        variant === 'voice-card' ? (
          <div
            data-testid="assistant-tools"
            className={cn('space-y-2 bg-card px-3 py-2', showResponse && 'border-b border-border')}
          >
            {tools}
          </div>
        ) : (
          <Collapsible
            title={labels?.tools || 'Tools'}
            defaultExpanded={false}
            expanded={toolsExpanded}
            onToggle={onToolsToggle}
            className={cn(showResponse && 'border-b border-border')}
            bodyClassName="space-y-2"
          >
            {tools}
          </Collapsible>
        )
      )}
      {showResponse && (
        <Section
          testId="assistant-response-content"
          title={showResponseLabel ? (labels?.response || 'Response') : undefined}
          last
        >
          {hasResponse ? (
            <div className="text-sm leading-relaxed">
              {response}
              {streaming && <StreamingCursor />}
            </div>
          ) : (
            <ThinkingDots className="py-1" />
          )}
        </Section>
      )}
    </>
  )

  const cardInner = <>{sections}{hasContent(footer) && (
    <div data-testid="assistant-response-footer" className="break-words px-3 pb-2 pt-1 text-xs leading-relaxed text-muted-foreground">
      {footer}
    </div>
  )}</>

  if (embedded) return <div data-testid="assistant-response-segment">{cardInner}</div>

  if (variant === 'voice-card') {
    return (
      <div data-testid="assistant-response" className={className}>
        <AgentVoiceCard streaming={streaming} className="overflow-hidden">
          {cardInner}
        </AgentVoiceCard>
      </div>
    )
  }

  return (
    <div data-testid="assistant-response" className={cn('flex w-full gap-3', className)}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-400/20 text-purple-600 dark:text-purple-300">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', headerClassName)}>
          <span className="font-medium">{labels?.assistant ?? actorName ?? 'Assistant'}</span>
          {time && <span className="font-mono">{time}</span>}
        </div>
        <div className={cn('overflow-hidden rounded-lg border border-border bg-card text-foreground', streaming && 'border-primary/40')}>
          {cardInner}
        </div>
      </div>
    </div>
  )
}

function Section({ children, last, testId, title }: { children: ReactNode; last?: boolean; testId: string; title?: ReactNode }) {
  return (
    <section data-testid={testId} className={cn('px-3 py-2', !last && 'border-b border-border')}>
      {title && <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>}
      {children}
    </section>
  )
}

function hasContent(value: ReactNode) {
  return value !== undefined && value !== null && value !== false
}
