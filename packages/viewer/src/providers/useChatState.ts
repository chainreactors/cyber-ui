import { useMemo } from 'react'
import { useAPGEvents } from './APGWebSocketProvider'
import { reduceChatState } from '../lib/event-reducer'
import type { ChatState } from '../lib/event-reducer'

export function useChatState(): ChatState {
  const { events } = useAPGEvents()
  return useMemo(() => reduceChatState(events), [events])
}
