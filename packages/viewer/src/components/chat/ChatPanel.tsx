import React, { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, Fragment } from 'react'
import { MessageSquare } from 'lucide-react'
import { cn } from '@cyber/theme'
import { MarkdownContent } from '@cyber/markdown'
import type { TimelineItem, ExtensionTimelineItem } from '../../types/timeline'
import type { BuiltinRendererOverride } from './timeline-registry'
import { resolveTimelineRenderer } from './timeline-registry'
import type { ChatInputProps } from './ChatInput'
import ChatInputComponent from './ChatInput'
import type { MessageBubbleVariant } from './MessageBubble'
import MessageBubble from './MessageBubble'
import AssistantResponse from './AssistantResponse'
import ChatThinking from './ChatThinking'
import ToolCallDisplay from './ToolCallDisplay'

// ── Context ──

interface ChatPanelContextValue {
  timeline: TimelineItem[]
  domainContext: Record<string, unknown>
  overrides: BuiltinRendererOverride
  variant: MessageBubbleVariant
}

const ChatPanelContext = createContext<ChatPanelContextValue>({
  timeline: [], domainContext: {}, overrides: {}, variant: 'bubble',
})

// ── ChatPanel root ──

export interface ChatPanelProps {
  timeline: TimelineItem[]
  domainContext?: Record<string, unknown>
  overrides?: BuiltinRendererOverride
  variant?: MessageBubbleVariant
  className?: string
  children: React.ReactNode
}

export function ChatPanel({
  timeline, domainContext = {}, overrides = {}, variant = 'bubble', className, children,
}: ChatPanelProps) {
  return (
    <ChatPanelContext.Provider value={{ timeline, domainContext, overrides, variant }}>
      <div className={cn('flex min-h-0 flex-1 flex-col', className)}>{children}</div>
    </ChatPanelContext.Provider>
  )
}

// ── Header ──

export interface ChatPanelHeaderProps { children: React.ReactNode; className?: string }

function ChatPanelHeader({ children, className }: ChatPanelHeaderProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>
}

// ── ErrorBar ──

export interface ChatPanelErrorBarProps { children: React.ReactNode; className?: string }

function ChatPanelErrorBar({ children, className }: ChatPanelErrorBarProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>
}

// ── Timeline ──

export interface ChatPanelTimelineProps {
  className?: string
  contentClassName?: string
  emptyState?: React.ReactNode
  renderItem?: (item: TimelineItem) => React.ReactNode | undefined | null
  autoScroll?: boolean
  renderMark?: (item: TimelineItem) => React.ReactNode | null
  renderSideNote?: (item: TimelineItem) => React.ReactNode | null
  stickyScroll?: boolean
  memoItems?: boolean
  scrollResetKey?: string | null
}

function ChatPanelTimeline({
  className, contentClassName, emptyState, renderItem, autoScroll = true,
  renderMark, renderSideNote, stickyScroll, memoItems,
  scrollResetKey,
}: ChatPanelTimelineProps) {
  const { timeline, domainContext, overrides, variant } = useContext(ChatPanelContext)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const stuckRef = useRef(true)
  const scrollFrameRef = useRef<number | null>(null)
  const scrollBehaviorRef = useRef<ScrollBehavior>('smooth')

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (behavior === 'instant' || scrollBehaviorRef.current !== 'instant') {
      scrollBehaviorRef.current = behavior
    }
    if (scrollFrameRef.current !== null) return
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      bottomRef.current?.scrollIntoView({ behavior: scrollBehaviorRef.current })
      scrollBehaviorRef.current = 'smooth'
    })
  }, [])

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
  }, [])

  useLayoutEffect(() => {
    stuckRef.current = true
    scrollToBottom('instant')
  }, [scrollResetKey, scrollToBottom])

  useEffect(() => {
    if (!autoScroll && !stickyScroll) return
    if (stickyScroll && !stuckRef.current) return
    scrollToBottom('smooth')
  }, [timeline, autoScroll, stickyScroll, scrollToBottom])

  useEffect(() => {
    if (!stickyScroll) return
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      stuckRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [stickyScroll])

  useEffect(() => {
    if (!stickyScroll) return
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      if (stuckRef.current) scrollToBottom('instant')
    })
    observer.observe(el)
    if (contentRef.current) observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [stickyScroll, scrollToBottom])

  const hasRail = !!(renderMark || renderSideNote)

  const renderOne = useCallback((item: TimelineItem) => {
    const custom = renderItem?.(item)
    if (custom !== undefined && custom !== null) return custom
    return renderTimelineItem(item, domainContext, overrides, variant)
  }, [renderItem, domainContext, overrides, variant])

  const ItemWrapper = memoItems ? MemoTimelineEntry : PassthroughEntry

  return (
    <div ref={scrollRef} className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-3', className)}>
      {timeline.length === 0 && (
        emptyState ?? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="mb-2 h-6 w-6 opacity-40" />
            <p className="text-xs">Waiting for messages...</p>
          </div>
        )
      )}

      <div ref={contentRef} className={cn('flex flex-col gap-3', hasRail && 'grid gap-x-2 gap-y-3', contentClassName)}
        style={hasRail ? { gridTemplateColumns: 'auto 1fr auto' } : undefined}>
        {timeline.map(item => (
          <Fragment key={item.id}>
            {renderMark && <div className="flex items-start pt-1">{renderMark(item)}</div>}
            <div className="min-w-0">
              <ItemWrapper item={item} render={renderOne} />
            </div>
            {renderSideNote && <div className="flex items-start pt-1">{renderSideNote(item)}</div>}
            {!hasRail && null}
          </Fragment>
        ))}
      </div>

      <div ref={bottomRef} />
    </div>
  )
}

const MemoTimelineEntry = memo(
  ({ item, render }: { item: TimelineItem; render: (item: TimelineItem) => React.ReactNode }) =>
    <>{render(item)}</>,
  (prev, next) => prev.item === next.item && prev.render === next.render,
)
MemoTimelineEntry.displayName = 'MemoTimelineEntry'

function PassthroughEntry({ item, render }: { item: TimelineItem; render: (item: TimelineItem) => React.ReactNode }) {
  return <>{render(item)}</>
}

// ── Input ──

export interface ChatPanelInputProps extends ChatInputProps { className?: string }

function ChatPanelInput({ className, ...inputProps }: ChatPanelInputProps) {
  return <div className={cn('shrink-0', className)}><ChatInputComponent {...inputProps} /></div>
}

// ── Compound assignments ──

ChatPanel.Header = ChatPanelHeader
ChatPanel.ErrorBar = ChatPanelErrorBar
ChatPanel.Timeline = ChatPanelTimeline
ChatPanel.Input = ChatPanelInput

// ── Timeline item renderer ──

function renderTimelineItem(
  item: TimelineItem,
  context: Record<string, unknown>,
  overrides: BuiltinRendererOverride,
  variant: MessageBubbleVariant,
): React.ReactNode {
  switch (item.kind) {
    case 'message': {
      if (item.role === 'thinking') {
        return (
          <ChatThinking actorName={item.actorName} variant={variant}>
            <MarkdownContent content={item.content} compact />
          </ChatThinking>
        )
      }
      if (item.role === 'assistant' && overrides.assistantMessage) {
        const Override = overrides.assistantMessage
        return <Override item={item} context={context} />
      }
      return (
        <MessageBubble role={item.role} actorName={item.actorName} streaming={item.streaming} variant={variant}>
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
          variant={variant}
          thinking={item.thinking ? <MarkdownContent content={item.thinking} compact muted /> : undefined}
          response={item.response ? <MarkdownContent content={item.response.content} /> : undefined}
          streaming={item.streaming}
          tools={item.tools.length > 0 ? item.tools.map(tc => (
            <ToolCallDisplay key={tc.id} toolName={tc.toolName} toolArgs={tc.toolArgs} result={tc.result} pending={tc.pending} />
          )) : undefined}
        />
      )
    }
    case 'tool_call': {
      if (overrides.toolCall) {
        const Override = overrides.toolCall
        return <Override item={item} context={context} />
      }
      return <ToolCallDisplay toolName={item.toolCall.toolName} toolArgs={item.toolCall.toolArgs} result={item.toolCall.result} pending={item.toolCall.pending} />
    }
    case 'divider':
      return (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /><span>{item.label}</span><div className="h-px flex-1 bg-border" />
        </div>
      )
    case 'extension':
      return renderExtensionItem(item, context)
    default:
      return null
  }
}

function renderExtensionItem(item: ExtensionTimelineItem, context: Record<string, unknown>): React.ReactNode {
  const config = resolveTimelineRenderer(item.extensionType)
  if (!config) return null
  const Renderer = config.renderer
  return <Renderer item={item} context={context} />
}
