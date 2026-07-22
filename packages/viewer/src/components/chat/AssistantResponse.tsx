import { type ReactNode } from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@cyber/theme'
import { Collapsible } from '@cyber/ui'
import type { MessageBubbleVariant } from './MessageBubble'
import { StreamingCursor } from './MessageBubble'
import { ThinkingDots } from './ChatThinking'
import { AgentVoiceCard } from './AgentVoiceCard'

export interface AssistantResponseProps {
  actorName?: string | null
  timestamp?: string
  thinking?: ReactNode
  tools?: ReactNode
  response?: ReactNode
  streaming?: boolean
  defaultThinkingExpanded?: boolean
  className?: string
  variant?: MessageBubbleVariant
  labels?: {
    thinking?: string
    tools?: string
    response?: string
    assistant?: string
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
  variant = 'bubble',
}: AssistantResponseProps) {
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : ''
  const hasThinking = hasContent(thinking)
  const hasTools = hasContent(tools)
  const hasResponse = hasContent(response)
  const showResponse = hasResponse || !!streaming
  const responseIsLast = !hasTools

  const cardInner = (
    <>
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
        <Section testId="assistant-response-content" title={labels?.response || 'Response'} last={responseIsLast}>
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
        <Section testId="assistant-response-tools" title={labels?.tools || 'Tools'} last>
          {tools}
        </Section>
      )}
    </>
  )

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
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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

function Section({ children, last, testId, title }: { children: ReactNode; last?: boolean; testId: string; title: string }) {
  return (
    <section data-testid={testId} className={cn('px-3 py-2', !last && 'border-b border-border')}>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </section>
  )
}

function hasContent(value: ReactNode) {
  return value !== undefined && value !== null && value !== false
}
