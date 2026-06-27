import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import type { APGEvent } from '../types/protocol'

interface APGWebSocketContextValue {
  events: APGEvent[]
  connected: boolean
  sendInput: (content: string) => void
}

const noop = () => {}

const APGWebSocketContext = createContext<APGWebSocketContextValue>({
  events: [],
  connected: false,
  sendInput: noop,
})

export function useAPGEvents() {
  return useContext(APGWebSocketContext)
}

interface Props {
  wsUrl: string
  children: React.ReactNode
}

/** Static event provider — feeds pre-loaded events without WebSocket. */
export function StaticEventProvider({ events, children }: {
  events: APGEvent[]
  children: React.ReactNode
}) {
  return (
    <APGWebSocketContext.Provider value={{ events, connected: true, sendInput: noop }}>
      {children}
    </APGWebSocketContext.Provider>
  )
}

export function APGWebSocketProvider({ wsUrl, children }: Props) {
  const [events, setEvents] = useState<APGEvent[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (e) => {
      try {
        const event: APGEvent = JSON.parse(e.data)
        setEvents((prev) => [...prev, event])
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimer.current = setTimeout(connect, 2000)
    }

    ws.onerror = () => ws.close()
  }, [wsUrl])

  const sendInput = useCallback((content: string) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'user_input', content }))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return (
    <APGWebSocketContext.Provider value={{ events, connected, sendInput }}>
      {children}
    </APGWebSocketContext.Provider>
  )
}
