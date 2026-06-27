export interface GatewaySocketEvent {
  data: string
  raw: MessageEvent
}

export type GatewaySocketListener = (event: GatewaySocketEvent) => void
export type GatewayConnectionListener = (connected: boolean) => void

export interface GatewayRealtimeClient {
  connect: () => void
  close: () => void
  subscribe: (listener: GatewaySocketListener) => () => void
  subscribeStatus: (listener: GatewayConnectionListener) => () => void
  sendJson: (payload: unknown) => boolean
  isConnected: () => boolean
}

export function createGatewayRealtimeClient(baseUrl: string, reconnectMs = 2000): GatewayRealtimeClient {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const socketUrl = normalizedBaseUrl.replace(/^http/i, 'ws') + '/ws'
  const messageListeners = new Set<GatewaySocketListener>()
  const statusListeners = new Set<GatewayConnectionListener>()
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let closed = false
  let connected = false

  const emitStatus = (next: boolean) => {
    if (connected === next) return
    connected = next
    statusListeners.forEach(listener => listener(connected))
  }

  const clearReconnect = () => {
    if (!reconnectTimer) return
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  const scheduleReconnect = () => {
    if (closed || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, reconnectMs)
  }

  const connect = () => {
    if (closed) return
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return
    try {
      const ws = new WebSocket(socketUrl)
      socket = ws
      ws.onopen = () => emitStatus(true)
      ws.onclose = () => {
        if (socket === ws) socket = null
        emitStatus(false)
        scheduleReconnect()
      }
      ws.onerror = () => ws.close()
      ws.onmessage = event => {
        messageListeners.forEach(listener => listener({
          data: typeof event.data === 'string' ? event.data : '',
          raw: event,
        }))
      }
    } catch {
      emitStatus(false)
      scheduleReconnect()
    }
  }

  const close = () => {
    closed = true
    clearReconnect()
    const current = socket
    socket = null
    current?.close()
    emitStatus(false)
  }

  return {
    connect,
    close,
    subscribe(listener) {
      messageListeners.add(listener)
      return () => { messageListeners.delete(listener) }
    },
    subscribeStatus(listener) {
      statusListeners.add(listener)
      listener(connected)
      return () => { statusListeners.delete(listener) }
    },
    sendJson(payload) {
      if (socket?.readyState !== WebSocket.OPEN) return false
      socket.send(JSON.stringify(payload))
      return true
    },
    isConnected() {
      return connected
    },
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}
