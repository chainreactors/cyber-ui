// LEGACY APG tier: no in-repo consumers and no Go producer — AOP
// (lib/aop-reducer.ts) is the only live message implementation.
// Kept intact pending a consumer-side refactor to AOP.

import { useMemo } from 'react'
import { useAPGEvents } from './APGWebSocketProvider'
import { reduceChatState } from '../lib/event-reducer'
import type { ChatState } from '../lib/event-reducer'

export function useChatState(): ChatState {
  const { events } = useAPGEvents()
  return useMemo(() => reduceChatState(events), [events])
}
