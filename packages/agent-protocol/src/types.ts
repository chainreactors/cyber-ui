import type { ErrorData } from './gen/error'
import type { MessageData, MessagePart, ImageSource } from './gen/message'
import type { MessageDeltaData } from './gen/message-delta'
import type { SessionEndData } from './gen/session-end'
import type { SessionStartData } from './gen/session-start'
import type { StatusData } from './gen/status'
import type { ToolCallData } from './gen/tool-call'
import type { ToolResultData } from './gen/tool-result'
import type { TurnData } from './gen/turn-start'
import type { TurnEndData } from './gen/turn-end'
import type { UsageData } from './gen/usage'

export type AOPCoreType =
  | 'session.start'
  | 'session.end'
  | 'message'
  | 'message.delta'
  | 'tool.call'
  | 'tool.result'
  | 'usage'

export type AOPOptionalType = 'turn.start' | 'turn.end' | 'error' | 'status'
export type AOPEventType = AOPCoreType | AOPOptionalType | (string & {})

export interface AOPEvent<T = Record<string, unknown>> {
  type: AOPEventType
  ts: string
  session_id: string
  agent: string
  seq?: number
  data: T
  ext?: Record<string, Record<string, unknown>>
}

export type MessagePartType = 'text' | 'reasoning' | 'image' | (string & {})
export type TurnStartData = TurnData
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

export type {
  ErrorData,
  ImageSource,
  MessageData,
  MessageDeltaData,
  MessagePart,
  SessionEndData,
  SessionStartData,
  StatusData,
  ToolCallData,
  ToolResultData,
  TurnEndData,
  UsageData,
}
