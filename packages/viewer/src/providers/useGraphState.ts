// LEGACY APG tier: no in-repo consumers and no Go producer — AOP
// (lib/aop-reducer.ts) is the only live message implementation.
// Kept intact pending a consumer-side refactor to AOP.

import { useMemo } from 'react'
import { useAPGEvents } from './APGWebSocketProvider'
import { reduceGraphState } from '../lib/event-reducer'
import type { GraphState } from '../lib/event-reducer'

export function useGraphState(): GraphState {
  const { events } = useAPGEvents()
  return useMemo(() => reduceGraphState(events), [events])
}
