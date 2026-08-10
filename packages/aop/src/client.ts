import {
  create,
  fromBinary,
  toBinary,
  type DescMessage,
  type Message,
  type MessageShape,
} from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import { EnvelopeSchema, type Envelope } from './gen/aop/envelope_pb.js'
import { ProtocolMessageSchema as CoreSchema } from './gen/aop/protocol_pb.js'
import { ProtocolMessageSchema as FileSchema } from './gen/aop/file/protocol_pb.js'
import { ProtocolMessageSchema as ExecSchema } from './gen/aop/exec/protocol_pb.js'
import { ProtocolMessageSchema as PtySchema } from './gen/aop/pty/protocol_pb.js'
import { ProtocolMessageSchema as ToolSchema } from './gen/aop/tool/protocol_pb.js'
import { ProtocolMessageSchema as SCOSchema } from './gen/aop/sco/protocol_pb.js'

export type AOPPayload = Message

type Pending = { resolve: (value: AOPPayload) => void; reject: (error: Error) => void }
type Subscription = {
  schema: DescMessage
  value: Message
  receive: (payload: AOPPayload, envelope: Envelope) => void
  durable: boolean
  cursor: string
  resume?: (cursor: string) => Message
}

const officialSchemas = [CoreSchema, FileSchema, ExecSchema, PtySchema, ToolSchema, SCOSchema] as const

export class AOPClient {
  private socket?: WebSocket
  private connecting?: Promise<void>
  private closed = false
  private reconnectDelay = 250
  private readonly outbound: Envelope[] = []
  private readonly pending = new Map<string, Pending>()
  private readonly subscriptions = new Map<string, Subscription>()
  private readonly restoreSubscriptions = new Set<string>()
  private readonly payloadSchemas = new Map<string, DescMessage>()

  constructor(private readonly url = defaultAOPURL()) {
    for (const schema of officialSchemas) this.register(schema)
  }

  register<Desc extends DescMessage>(schema: Desc): this {
    if (this.payloadSchemas.has(schema.typeName)) throw new Error(`AOP namespace ${schema.typeName} is already registered`)
    this.payloadSchemas.set(schema.typeName, schema)
    return this
  }

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return
    if (this.connecting) return this.connecting
    this.closed = false
    this.connecting = new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.url)
      socket.binaryType = 'arraybuffer'
      socket.onopen = () => {
        this.socket = socket
        this.connecting = undefined
        this.reconnectDelay = 250
        this.flush()
        for (const id of this.restoreSubscriptions) {
          const subscription = this.subscriptions.get(id)
          if (!subscription) continue
          const value = subscription.resume?.(subscription.cursor) ?? subscription.value
          this.write(this.envelope(id, subscription.schema, value))
        }
        this.restoreSubscriptions.clear()
        resolve()
      }
      socket.onmessage = (event) => this.receive(event.data)
      socket.onerror = () => {
        if (socket.readyState !== WebSocket.OPEN) reject(new Error('AOP WebSocket connection failed'))
      }
      socket.onclose = () => this.disconnected(socket)
    })
    return this.connecting
  }

  send<Desc extends DescMessage>(schema: Desc, value: MessageShape<Desc>, options?: { id?: string; replyTo?: string }): string {
    const id = options?.id || newID()
    this.write(this.envelope(id, schema, value, options?.replyTo))
    return id
  }

  request<Desc extends DescMessage>(schema: Desc, value: MessageShape<Desc>, options?: { id?: string }): Promise<AOPPayload> {
    const id = options?.id || newID()
    return new Promise<AOPPayload>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.write(this.envelope(id, schema, value))
    })
  }

  subscribe<Desc extends DescMessage>(
    schema: Desc,
    value: MessageShape<Desc>,
    receive: (payload: AOPPayload, envelope: Envelope) => void,
    options?: { id?: string; durable?: boolean; resume?: (cursor: string) => MessageShape<Desc> },
  ): () => void {
    const id = options?.id || newID()
    // Replacing a subscription while disconnected queues its fresh request; it
    // must not also be restored from the previous connection.
    this.restoreSubscriptions.delete(id)
    this.subscriptions.set(id, {
      schema,
      value: value as Message,
      receive,
      durable: options?.durable === true,
      cursor: '',
      resume: options?.resume as ((cursor: string) => Message) | undefined,
    })
    this.write(this.envelope(id, schema, value))
    return () => {
      this.subscriptions.delete(id)
      const cancel = create(CoreSchema, { message: { case: 'cancelOperation', value: { targetId: id } } })
      this.send(CoreSchema, cancel)
    }
  }

  close(): void {
    this.closed = true
    this.connecting = undefined
    this.socket?.close()
    this.socket = undefined
    const error = new Error('AOP client closed')
    for (const pending of this.pending.values()) pending.reject(error)
    this.pending.clear()
    this.subscriptions.clear()
    this.restoreSubscriptions.clear()
    this.outbound.length = 0
  }

  private envelope<Desc extends DescMessage>(id: string, schema: Desc, value: MessageShape<Desc>, replyTo = ''): Envelope {
    return create(EnvelopeSchema, { id, replyTo, payload: anyPack(schema, value) })
  }

  private write(envelope: Envelope): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(toBinary(EnvelopeSchema, envelope))
      return
    }
    this.outbound.push(envelope)
    void this.connect().catch(() => {})
  }

  private flush(): void {
    while (this.outbound.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(toBinary(EnvelopeSchema, this.outbound.shift()!))
    }
  }

  private receive(raw: unknown): void {
    if (!(raw instanceof ArrayBuffer)) return
    const envelope = fromBinary(EnvelopeSchema, new Uint8Array(raw))
    const payload = this.decodePayload(envelope)
    if (!payload) return
    const subscription = this.subscriptions.get(envelope.replyTo)
    if (subscription) {
      if (envelope.deliveryCursor) subscription.cursor = envelope.deliveryCursor
      subscription.receive(payload, envelope)
      return
    }
    const pending = this.pending.get(envelope.replyTo)
    if (pending) {
      this.pending.delete(envelope.replyTo)
      pending.resolve(payload)
    }
  }

  private disconnected(socket: WebSocket): void {
    const wasConnected = this.socket === socket
    if (wasConnected) this.socket = undefined
    this.connecting = undefined
    if (wasConnected) {
      const queued = new Set(this.outbound.map((envelope) => envelope.id))
      const dropped = new Set<string>()
      const error = new Error('AOP WebSocket disconnected')
      for (const [id, pending] of this.pending) {
        pending.reject(error)
        dropped.add(id)
      }
      this.pending.clear()
      for (const [id, subscription] of this.subscriptions) {
        if (subscription.durable) {
          if (!queued.has(id)) this.restoreSubscriptions.add(id)
          continue
        }
        this.subscriptions.delete(id)
        dropped.add(id)
      }
      for (let index = this.outbound.length - 1; index >= 0; index--) {
        if (dropped.has(this.outbound[index].id)) this.outbound.splice(index, 1)
      }
    }
    if (this.closed) return
    const delay = this.reconnectDelay
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 5000)
    globalThis.setTimeout(() => void this.connect().catch(() => {}), delay)
  }

  private decodePayload(envelope: Envelope): AOPPayload | undefined {
    if (!envelope.payload) return undefined
    const typeName = envelope.payload.typeUrl.slice(envelope.payload.typeUrl.lastIndexOf('/') + 1)
    const schema = this.payloadSchemas.get(typeName)
    return schema ? anyUnpack(envelope.payload, schema) : undefined
  }
}

function defaultAOPURL(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/aop/application/ws`
}

function newID(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
