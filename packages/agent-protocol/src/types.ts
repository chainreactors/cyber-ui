/**
 * Agent Output Protocol (AOP)
 *
 * A language-neutral JSONL event protocol for AI coding agents.
 * Every agent outputs these events; every orchestrator consumes them without
 * per-agent transport translation.
 */

// Envelope

export interface AOPEvent<T extends AOPData = AOPData> {
  /** Dot-separated event type. */
  type: AOPEventType
  /** RFC 3339 timestamp. */
  ts: string
  /** Stable session identifier. */
  session_id: string
  /** Stable identifier for the run within a session. */
  turn_id?: string
  /** Agent name that emitted this event. */
  agent: string
  /** Monotonically increasing sequence number within the session. */
  seq?: number
  /** Type-specific payload. */
  data: T
  /** Extension payloads keyed by namespace. */
  ext?: Record<string, Record<string, unknown>>
}

// Event types

export type AOPCoreType =
  | 'session.start'
  | 'session.end'
  | 'message'
  | 'message.delta'
  | 'tool.call'
  | 'tool.result'
  | 'usage'

export type AOPOptionalType =
  | 'turn.start'
  | 'turn.end'
  | 'error'
  | 'status'

/** Known event types plus a forward-compatible string type. */
export type AOPEventType = AOPCoreType | AOPOptionalType | (string & {})

// Message parts

export type MessagePartType = 'text' | 'reasoning' | 'image'

export interface ImageSource {
  /** Local image path, mutually exclusive with base64. */
  path?: string
  /** Base64-encoded image bytes, mutually exclusive with path. */
  base64?: string
  /** MIME type for base64 image data. */
  media_type?: string
}

export interface MessagePart {
  type: MessagePartType | (string & {})
  /** Content for text and reasoning parts. */
  text?: string
  /** Content for image parts. */
  image?: ImageSource
}

// Data payloads

export interface SessionStartData {
  model?: string
  parent_session_id?: string
  parent_tool_call_id?: string
}

export interface SessionEndData {
  reason: string
}

export interface MessageData {
  message_id: string
  role: string
  parts: MessagePart[]
}

export interface MessageDeltaData {
  message_id: string
  part_index: number
  part_type: string
  delta: string
}

export interface ToolCallData {
  tool_call_id: string
  tool_name: string
  args: unknown
  work_dir?: string
}

export interface ToolResultData {
  tool_call_id: string
  tool_name?: string
  content: unknown
  details?: unknown
  is_error?: boolean
  duration_ms?: number
  terminate?: boolean
}

export interface UsageData {
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cache_read_tokens?: number
  cache_write_tokens?: number
  model?: string
}

export type TurnStartData = Record<string, never>

export interface TurnEndData {
  stop: string
  error?: string
  context_tokens?: number
  usage?: UsageData
}

export interface ErrorData {
  message: string
  code?: string
  retryable?: boolean
}

export interface StatusData {
  state: string
}

export type AOPData =
  | SessionStartData
  | SessionEndData
  | MessageData
  | MessageDeltaData
  | ToolCallData
  | ToolResultData
  | UsageData
  | TurnStartData
  | TurnEndData
  | ErrorData
  | StatusData
  | Record<string, unknown>

// Typed event aliases

export type SessionStartEvent = AOPEvent<SessionStartData> & { type: 'session.start' }
export type SessionEndEvent = AOPEvent<SessionEndData> & { type: 'session.end' }
export type MessageEvent = AOPEvent<MessageData> & { type: 'message' }
export type MessageDeltaEvent = AOPEvent<MessageDeltaData> & { type: 'message.delta' }
export type ToolCallEvent = AOPEvent<ToolCallData> & { type: 'tool.call' }
export type ToolResultEvent = AOPEvent<ToolResultData> & { type: 'tool.result' }
export type UsageEvent = AOPEvent<UsageData> & { type: 'usage' }
export type TurnStartEvent = AOPEvent<TurnStartData> & { type: 'turn.start' }
export type TurnEndEvent = AOPEvent<TurnEndData> & { type: 'turn.end' }
export type ErrorEvent = AOPEvent<ErrorData> & { type: 'error' }
export type StatusEvent = AOPEvent<StatusData> & { type: 'status' }
