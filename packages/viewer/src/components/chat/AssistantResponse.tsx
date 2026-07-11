import { type ReactNode } from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@cyber/theme'
import { Collapsible } from '@cyber/ui'
import { StreamingCursor } from './MessageBubble'
import { ThinkingDots } from './ChatThinking'

export interface AssistantResponseProps {
  actorName?: string | null
  timestamp?: string
  thinking?: ReactNode
  tools?: ReactNode
  response?: ReactNode
  streaming?: boolean
  defaultThinkingExpanded?: boolean
  className?: string
  labels?: {
    thinking?: string
    tools?: string
    response?: string
  }
}

export default function AssistantResponse({
  actorName,
  className,
  defaultThinkingExpanded = false,
  labels,
  response,
  streaming,
  thinking,
  timestamp,
  tools,
}: AssistantResponseProps) {
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : ''
  const hasThinking = hasContent(thinking)
  const hasTools = hasContent(tools)
  const hasResponse = hasContent(response)
  const showResponse = hasResponse || !!streaming
  const responseIsLast = !hasTools

  return (
    <div data-testid="assistant-response" className={cn('flex w-full gap-3', className)}>
      {/* avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-400/20 text-purple-600 dark:text-purple-300">
        <Bot className="h-3.5 w-3.5" />
      </div>

      {/* card */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-medium">{actorName || 'Assistant'}</span>
          {time && <span className="font-mono">{time}</span>}
        </div>

        <div
          className={cn(
            'overflow-hidden rounded-lg border border-border bg-card text-foreground',
            streaming && 'border-primary/40',
          )}
        >
          {hasThinking && (
            <Collapsible
              title={labels?.thinking || 'Thinking'}
              defaultExpanded={defaultThinkingExpanded}
              className={cn(!showResponse && !hasTools ? '' : 'border-b border-border')}
              bodyClassName="text-sm leading-relaxed text-muted-foreground"
            >
              {thinking}
            </Collapsible>
          )}

          {showResponse && (
            <Section
              testId="assistant-response-content"
              title={labels?.response || 'Response'}
              last={responseIsLast}
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

          {hasTools && (
            <Section
              testId="assistant-response-tools"
              title={labels?.tools || 'Tools'}
              last
            >
              {tools}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({
  children,
  last,
  testId,
  title,
}: {
  children: ReactNode
  last?: boolean
  testId: string
  title: string
}) {
  return (
    <section data-testid={testId} className={cn('px-3 py-2', !last && 'border-b border-border')}>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  )
}

function hasContent(value: ReactNode) {
  return value !== undefined && value !== null && value !== false
}
