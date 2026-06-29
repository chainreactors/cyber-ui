import React, { createContext, useContext, useEffect, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { cn } from '@aspect/theme'
import { MarkdownContent } from '@aspect/markdown'
import type { TimelineItem, ExtensionTimelineItem } from '../../types/timeline'
import type { BuiltinRendererOverride } from './timeline-registry'
import { resolveTimelineRenderer } from './timeline-registry'
import type { ChatInputProps } from './ChatInput'
import ChatInputComponent from './ChatInput'
import MessageBubble from './MessageBubble'
import AssistantResponse from './AssistantResponse'
import ChatThinking from './ChatThinking'
import ToolCallDisplay from './ToolCallDisplay'

interface ChatPanelContextValue {
  timeline: TimelineItem[]
  domainContext: Record<string, unknown>
  overrides: BuiltinRendererOverride
}

const ChatPanelContext = createContext<ChatPanelContextValue>({
  timeline: [],
  domainContext: {},
  overrides: {},
})

export interface ChatPanelProps {
  timeline: TimelineItem[]
  domainContext?: Record<string, unknown>
  overrides?: BuiltinRendererOverride
  className?: string
  children: React.ReactNode
}

export function ChatPanel({
  timeline,
  domainContext = {},
  overrides = {},
  className,
  children,
}: ChatPanelProps) {
  return (
    <ChatPanelContext.Provider value={{ timeline, domainContext, overrides }}>
      <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
        {children}
      </div>
    </ChatPanelContext.Provider>
  )
}

export interface ChatPanelHeaderProps {
  children: React.ReactNode
  className?: string
}

function ChatPanelHeader({ children, className }: ChatPanelHeaderProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>
}

export interface ChatPanelTimelineProps {
  className?: string
  emptyState?: React.ReactNode
  renderItem?: (item: TimelineItem) => React.ReactNode | undefined | null
  autoScroll?: boolean
}

function ChatPanelTimeline({
  className,
  emptyState,
  renderItem,
  autoScroll = true,
}: ChatPanelTimelineProps) {
  const { timeline, domainContext, overrides } = useContext(ChatPanelContext)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [timeline.length, autoScroll])

  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-3', className)}>
      {timeline.length === 0 && (
        emptyState ?? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="mb-2 h-6 w-6 opacity-40" />
            <p className="text-xs">Waiting for messages...</p>
          </div>
        )
      )}

      <div className="flex flex-col gap-3">
        {timeline.map((item) => {
          const custom = renderItem?.(item)
          if (custom !== undefined && custom !== null) {
            return <React.Fragment key={item.id}>{custom}</React.Fragment>
          }
          return (
            <React.Fragment key={item.id}>
              {renderTimelineItem(item, domainContext, overrides)}
            </React.Fragment>
          )
        })}
      </div>

      <div ref={bottomRef} />
    </div>
  )
}

export interface ChatPanelInputProps extends ChatInputProps {
  className?: string
}

function ChatPanelInput({ className, ...inputProps }: ChatPanelInputProps) {
  return (
    <div className={cn('shrink-0', className)}>
      <ChatInputComponent {...inputProps} />
    </div>
  )
}

ChatPanel.Header = ChatPanelHeader
ChatPanel.Timeline = ChatPanelTimeline
ChatPanel.Input = ChatPanelInput

function renderTimelineItem(
  item: TimelineItem,
  context: Record<string, unknown>,
  overrides: BuiltinRendererOverride,
): React.ReactNode {
  switch (item.kind) {
    case 'message': {
      if (item.role === 'thinking') {
        return (
          <ChatThinking actorName={item.actorName}>
            <MarkdownContent content={item.content} compact />
          </ChatThinking>
        )
      }
      if (item.role === 'assistant' && overrides.assistantMessage) {
        const Override = overrides.assistantMessage
        return <Override item={item} context={context} />
      }
      return (
        <MessageBubble role={item.role} actorName={item.actorName} streaming={item.streaming}>
          <MarkdownContent content={item.content} />
        </MessageBubble>
      )
    }

    case 'assistant_response': {
      if (overrides.assistantResponse) {
        const Override = overrides.assistantResponse
        return <Override item={item} context={context} />
      }
      return (
        <AssistantResponse
          actorName={item.actorName}
          thinking={item.thinking ? <MarkdownContent content={item.thinking} compact muted /> : undefined}
          response={item.response ? <MarkdownContent content={item.response.content} /> : undefined}
          streaming={item.streaming}
          tools={
            item.tools.length > 0
              ? item.tools.map((tc) => (
                  <ToolCallDisplay
                    key={tc.id}
                    toolName={tc.toolName}
                    toolArgs={tc.toolArgs}
                    result={tc.result}
                    pending={tc.pending}
                  />
                ))
              : undefined
          }
        />
      )
    }

    case 'tool_call': {
      if (overrides.toolCall) {
        const Override = overrides.toolCall
        return <Override item={item} context={context} />
      }
      return (
        <ToolCallDisplay
          toolName={item.toolCall.toolName}
          toolArgs={item.toolCall.toolArgs}
          result={item.toolCall.result}
          pending={item.toolCall.pending}
        />
      )
    }

    case 'divider': {
      return (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>{item.label}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )
    }

    case 'extension': {
      return renderExtensionItem(item, context)
    }

    default:
      return null
  }
}

function renderExtensionItem(
  item: ExtensionTimelineItem,
  context: Record<string, unknown>,
): React.ReactNode {
  const config = resolveTimelineRenderer(item.extensionType)
  if (!config) return null
  const Renderer = config.renderer
  return <Renderer item={item} context={context} />
}
