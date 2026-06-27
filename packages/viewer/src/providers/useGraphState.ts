import { useMemo } from 'react'
import { useAPGEvents } from './APGWebSocketProvider'
import { reduceGraphState } from '../lib/event-reducer'
import type { GraphState } from '../lib/event-reducer'

export function useGraphState(): GraphState {
  const { events } = useAPGEvents()
  return useMemo(() => reduceGraphState(events), [events])
}
