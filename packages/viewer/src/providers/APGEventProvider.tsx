import React, { createContext, useContext } from 'react'
import type { APGEvent } from '../types/protocol'

export interface APGEventSource {
  events: APGEvent[]
  connected: boolean
  sendInput: (content: string) => void
}

const noop = () => {}

const APGEventContext = createContext<APGEventSource>({
  events: [],
  connected: false,
  sendInput: noop,
})

export function useAPGEvents() {
  return useContext(APGEventContext)
}

export function APGEventProvider({
  events,
  connected = true,
  sendInput = noop,
  children,
}: {
  events: APGEvent[]
  connected?: boolean
  sendInput?: (content: string) => void
  children: React.ReactNode
}) {
  return (
    <APGEventContext.Provider value={{ events, connected, sendInput }}>
      {children}
    </APGEventContext.Provider>
  )
}

export function StaticEventProvider({ events, children }: {
  events: APGEvent[]
  children: React.ReactNode
}) {
  return <APGEventProvider events={events}>{children}</APGEventProvider>
}
