import { createContext, useContext, type ReactNode } from 'react'
import type { TimelineItem } from '../types/timeline'
import type { ChatAttachment } from '../components/chat/ChatInput'

export interface ChatSessionState {
  sessionId: string | null
  targetLabel: string
  busy: boolean
  timeline: TimelineItem[]
  error: string | null
}

export interface ChatSessionActions {
  sendMessage: (content: string, attachments?: ChatAttachment[]) => void
  cancelMessage: () => void
  clearError: () => void
}

export type ChatSessionContextValue = ChatSessionState & ChatSessionActions

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null)

export function useChatSessionContext(): ChatSessionContextValue {
  const ctx = useContext(ChatSessionContext)
  if (!ctx) throw new Error('useChatSessionContext must be used within ChatSessionProvider')
  return ctx
}

export function ChatSessionProvider({
  value,
  children,
}: {
  value: ChatSessionContextValue
  children: ReactNode
}) {
  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  )
}
