import { useMemo } from 'react'
import type { Event } from '@cyber/aop'
import { createObservationReducer } from './observations'

export function useObservations(events: readonly Event[]): readonly Event[] {
  const reduce = useMemo(() => createObservationReducer(), [])
  return useMemo(() => reduce(events), [events, reduce])
}
