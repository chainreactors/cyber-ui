// LEGACY APG tier: no in-repo consumers and no Go producer — AOP
// (AOPChatPanel / lib/aop-reducer.ts) is the only live message implementation.
// Kept intact pending a consumer-side refactor to AOP.

import React, { useEffect, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { cn } from '@cyber/theme'
import { useChatState } from '../../providers/useChatState'
import { useAPGEvents } from '../../providers/APGWebSocketProvider'
import type { ChatMessage } from '../../lib/event-reducer'
import MessageBubble from './MessageBubble'
import ToolCallDisplay from './ToolCallDisplay'
import ChatInput from './ChatInput'

export interface LiveChatPanelProps {
  messages: ChatMessage[]
  isDark?: boolean
  className?: string
  renderMessage?: (msg: ChatMessage) => React.ReactNode
  renderToolCall?: (msg: ChatMessage) => React.ReactNode
  onSendInput?: (content: string) => void
}

export default function LiveChatPanel({
  messages,
  className,
  renderMessage,
  renderToolCall,
  onSendInput,
}: LiveChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {/* scrollable message area */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="mb-2 h-6 w-6 opacity-40" />
            <p className="text-xs">Waiting for agent events...</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((msg) => {
            if (msg.kind === 'tool-call' || msg.kind === 'tool-return') {
              if (renderToolCall) {
                return <React.Fragment key={msg.id}>{renderToolCall(msg)}</React.Fragment>
              }
              return (
                <ToolCallDisplay
                  key={msg.id}
                  toolName={msg.toolName ?? ''}
                  toolArgs={msg.content}
                  defaultExpanded
                />
              )
            }

            if (renderMessage) {
              return <React.Fragment key={msg.id}>{renderMessage(msg)}</React.Fragment>
            }
            return (
              <MessageBubble
                key={msg.id}
                role={msg.kind}
                actorName={msg.agentName}
                timestamp={msg.timestamp}
              >
                {msg.content}
              </MessageBubble>
            )
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      {onSendInput && (
        <ChatInput onSend={onSendInput} />
      )}
    </div>
  )
}

/** Connected wrapper — pulls data from useChatState() hook (requires APGWebSocketProvider). */
export function ConnectedChatPanel(props: Omit<LiveChatPanelProps, 'messages' | 'onSendInput'>) {
  const { messages } = useChatState()
  const { sendInput } = useAPGEvents()
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])

  const handleSend = (content: string) => {
    const msg: ChatMessage = {
      id: `local-${Date.now()}`,
      kind: 'user',
      agentName: 'You',
      content,
      timestamp: new Date().toISOString(),
    }
    setLocalMessages((prev) => [...prev, msg])
    sendInput(content)
  }

  const allMessages = [...messages, ...localMessages]
  return <LiveChatPanel messages={allMessages} onSendInput={handleSend} {...props} />
}
