import { create, toBinary } from '@bufbuild/protobuf'
import { anyPack } from '@bufbuild/protobuf/wkt'
import { AOPClient, AOPProtocolMessageSchema, EnvelopeSchema } from '@cyber/aop'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class Socket {
  static readonly OPEN = 1
  static instances: Socket[] = []
  readyState = 0
  binaryType = ''
  onopen?: () => void
  onclose?: () => void
  onmessage?: (event: { data: ArrayBuffer }) => void
  send = vi.fn()
  constructor() { Socket.instances.push(this) }
  open() { this.readyState = Socket.OPEN; this.onopen?.() }
  close() { this.readyState = 3 }
}

describe('AOP client request and connection boundaries', () => {
  let client: AOPClient

  beforeEach(() => {
    vi.useFakeTimers()
    Socket.instances = []
    vi.stubGlobal('WebSocket', Socket)
    client = new AOPClient('ws://fixture.invalid')
  })

  afterEach(() => {
    client.close()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reports connection changes and lets consumers unsubscribe', async () => {
    const changed = vi.fn()
    const unsubscribe = client.onConnectionChange(changed)
    expect(client.connected).toBe(false)
    const connecting = client.connect()
    const socket = Socket.instances[0]
    socket.open()
    await connecting
    expect(client.connected).toBe(true)
    expect(changed.mock.calls).toEqual([[true]])
    client.close()
    socket.onclose?.()
    expect(client.connected).toBe(false)
    expect(changed.mock.calls).toEqual([[true], [false]])
    unsubscribe()
    client.close()
    expect(changed).toHaveBeenCalledTimes(2)
  })

  it('rejects connected-only operations without queuing them for a later connection', async () => {
    await expect(client.request(AOPProtocolMessageSchema, create(AOPProtocolMessageSchema), {
      requireConnected: true,
    })).rejects.toThrow('disconnected')
    expect(Socket.instances).toHaveLength(0)
  })

  it('never replays a queued operation after its deadline', async () => {
    const request = client.request(AOPProtocolMessageSchema, create(AOPProtocolMessageSchema), {
      timeoutMs: 100,
    })
    const rejection = expect(request).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(100)
    await rejection
    const socket = Socket.instances[0]
    socket.open()
    expect(socket.send).not.toHaveBeenCalled()
  })

  it('clears the deadline after the response arrives', async () => {
    const connecting = client.connect()
    const socket = Socket.instances[0]
    socket.open()
    await connecting
    const response = create(AOPProtocolMessageSchema)
    const request = client.request(AOPProtocolMessageSchema, response, { id: 'request-1', timeoutMs: 100 })
    const envelope = create(EnvelopeSchema, {
      replyTo: 'request-1', payload: anyPack(AOPProtocolMessageSchema, response),
    })
    socket.onmessage?.({ data: toBinary(EnvelopeSchema, envelope).slice().buffer as ArrayBuffer })
    await expect(request).resolves.toEqual(response)
    expect(vi.getTimerCount()).toBe(0)
  })
})
