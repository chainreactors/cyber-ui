import React, { useEffect, useRef, useState, type CSSProperties } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { useChatState } from '../../providers/useChatState'
import { useAPGEvents } from '../../providers/APGWebSocketProvider'
import type { ChatMessage } from '../../lib/event-reducer'
import MessageBubble from './MessageBubble'
import ToolCallDisplay from './ToolCallDisplay'

export interface LiveChatPanelProps {
  messages: ChatMessage[]
  isDark?: boolean
  renderMessage?: (msg: ChatMessage) => React.ReactNode
  renderToolCall?: (msg: ChatMessage) => React.ReactNode
  onSendInput?: (content: string) => void
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
}

const scrollStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: '12px 16px',
}

const innerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const emptyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#9ca3af',
}

const inputBarStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '8px 12px',
  borderTop: '1px solid #374151',
}

const textareaStyle: CSSProperties = {
  flex: 1,
  resize: 'none',
  border: '1px solid #4b5563',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  lineHeight: '1.4',
  background: 'transparent',
  color: 'inherit',
  outline: 'none',
  fontFamily: 'inherit',
}

const sendBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  border: 'none',
  borderRadius: 6,
  background: '#3b82f6',
  color: '#fff',
  cursor: 'pointer',
  flexShrink: 0,
  alignSelf: 'flex-end',
}

export default function LiveChatPanel({
  messages,
  isDark,
  renderMessage,
  renderToolCall,
  onSendInput,
}: LiveChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')

  const handleSend = () => {
    const text = draft.trim()
    if (!text || !onSendInput) return
    onSendInput(text)
    setDraft('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div style={containerStyle}>
      <div style={scrollStyle}>
        {messages.length === 0 && (
          <div style={emptyStyle}>
            <MessageSquare style={{ width: 24, height: 24, marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 12 }}>Waiting for agent events...</p>
          </div>
        )}

        <div style={innerStyle}>
          {messages.map((msg) => {
            if (msg.kind === 'tool-call' || msg.kind === 'tool-return') {
              if (renderToolCall) return <React.Fragment key={msg.id}>{renderToolCall(msg)}</React.Fragment>
              return (
                <ToolCallDisplay
                  key={msg.id}
                  kind={msg.kind}
                  toolName={msg.toolName ?? ''}
                  content={msg.content}
                  toolCallId={msg.toolCallId}
                  rawContent={msg.rawContent}
                  isDark={isDark}
                />
              )
            }

            if (renderMessage) return <React.Fragment key={msg.id}>{renderMessage(msg)}</React.Fragment>
            return (
              <MessageBubble
                key={msg.id}
                kind={msg.kind}
                agentName={msg.agentName}
                content={msg.content}
                timestamp={msg.timestamp}
                isDark={isDark}
              />
            )
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      {onSendInput && (
        <div style={inputBarStyle}>
          <textarea
            rows={1}
            style={textareaStyle}
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            style={{ ...sendBtnStyle, opacity: draft.trim() ? 1 : 0.5 }}
            disabled={!draft.trim()}
            onClick={handleSend}
            aria-label="Send"
          >
            <Send style={{ width: 16, height: 16 }} />
          </button>
        </div>
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
