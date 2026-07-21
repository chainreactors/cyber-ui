/**
 * Agent Output Protocol (AOP)
 *
 * A language-neutral JSONL event protocol for AI coding agents.
 * Every agent (aiscan, codex, claude-code, …) outputs these events;
 * every orchestrator (aide, cairn, …) consumes them without per-agent translation.
 *
 * Envelope:  { type, ts, session_id, agent, seq?, data, ext? }
 * Core:      7 event types cover all agent interactions
 * Extension: ext.<agent_name>.* carries agent-specific data
 */

// ── Envelope ────────────────────────────────────────────────────

export interface AOPEvent<T extends AOPData = AOPData> {
  /** Event type — dot-separated hierarchy. */
  type: AOPEventType
  /** RFC 3339 timestamp with nanosecond precision. */
  ts: string
  /** Session identifier. */
  session_id: string
  /** Agent name that emitted this event. */
  agent: string
  /** Monotonically increasing sequence number within the session. */
  seq?: number
  /** Type-specific payload. */
  data: T
  /** Agent-specific extensions, keyed by agent name. */
  ext?: Record<string, Record<string, unknown>>
}

// ── Event types ─────────────────────────────────────────────────

/** Core event types — the universal minimum every agent emits. */
export type AOPCoreType =
  | 'session.start'
  | 'session.end'
  | 'message'
  | 'message.delta'
  | 'tool.call'
  | 'tool.result'
  | 'usage'

/** Optional event types — not all agents emit these. */
export type AOPOptionalType =
  | 'turn.start'
  | 'turn.end'
  | 'error'
  | 'status'

/** All known event types, plus string for forward compatibility. */
export type AOPEventType = AOPCoreType | AOPOptionalType | (string & {})

// ── Message parts ─────────────────────────────────────────────

export type MessagePartType = 'text' | 'reasoning' | 'image'

export interface ImageSource {
  /** Local path to the image file. Mutually exclusive with base64. */
  path?: string
  /** Base64-encoded image bytes. Mutually exclusive with path. */
  base64?: string
  /** MIME type, required when base64 is set (e.g. "image/png"). */
  media_type?: string
}

export interface MessagePart {
  type: MessagePartType | (string & {})
  /** Present for text/reasoning parts. */
  text?: string
  /** Present for image parts. */
  image?: ImageSource
}

// ── Data payloads ───────────────────────────────────────────────

export interface SessionStartData {
  /** Model name used for this session. */
  model?: string
  /** Parent session ID for sub-agent scenarios. */
  parent_session_id?: string
}

export interface SessionEndData {
  /** Stop reason: completed | canceled | error | budget | terminated | stopped */
  stop: string
  /** Total number of turns in this session. */
  turns?: number
  /** Error message when stop is "error". */
  error?: string
}

export interface MessageData {
  /** Stable message identifier ("m-<n>" per session), reused across retries. */
  message_id: string
  /** Message role: user | assistant | system | tool. */
  role: string
  /** Ordered content parts. */
  parts: MessagePart[]
}

export interface MessageDeltaData {
  /** Message this delta belongs to. */
  message_id: string
  /** Index into the message's parts array this delta extends. */
  part_index: number
  /** Part type of the target part (text | reasoning). */
  part_type: string
  /** Incremental text to append to the part. */
  delta: string
}

export interface ToolCallData {
  /** Unique identifier for this tool call. */
  tool_call_id: string
  /** Tool name. */
  tool_name: string
  /** Call arguments — object preferred, JSON string accepted. */
  args: Record<string, unknown> | string
}

export interface ToolResultData {
  /** Corresponding tool call ID. */
  tool_call_id: string
  /** Tool name (redundant but convenient). */
  tool_name?: string
  /** Return value — string or structured object. */
  content: string | Record<string, unknown>
  /** Whether the tool returned an error. */
  is_error?: boolean
  /** Execution duration in milliseconds. */
  duration_ms?: number
}

export interface UsageData {
  /** Input / prompt tokens. */
  input_tokens: number
  /** Output / completion tokens. */
  output_tokens: number
  /** Total tokens (input + output). */
  total_tokens: number
  /** Tokens served from cache. */
  cache_read_tokens?: number
  /** Tokens written to cache. */
  cache_write_tokens?: number
  /** Model name if different from session.start. */
  model?: string
}

export interface TurnStartData {
  /** Turn number (1-indexed). */
  turn: number
}

export interface TurnEndData {
  /** Turn number. */
  turn: number
}

export interface ErrorData {
  /** Human-readable error message. */
  message: string
  /** Machine-readable error code. */
  code?: string
  /** Whether the error is retryable. */
  retryable?: boolean
}

export interface StatusData {
  /** Current state: idle | busy | thinking */
  state: string
}

/** Union of all data payloads. */
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

// ── Typed event aliases ─────────────────────────────────────────

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
