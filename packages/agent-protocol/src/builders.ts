/**
 * Convenience builders for constructing AOP events.
 *
 * Usage:
 *   const evt = messageEvent({ agent: 'aiscan', session_id: 's1' }, { message_id: 'm-1', role: 'user', parts: [{ type: 'text', text: 'hi' }] })
 */

import type {
  AOPEvent,
  AOPData,
  AOPEventType,
  SessionStartData,
  SessionEndData,
  MessageData,
  MessageDeltaData,
  ToolCallData,
  ToolResultData,
  UsageData,
  TurnStartData,
  TurnEndData,
  ErrorData,
  StatusData,
} from './types'

interface EventEnvelope {
  agent: string
  session_id: string
  seq?: number
  ext?: Record<string, Record<string, unknown>>
}

function makeEvent<T extends AOPData>(type: AOPEventType, env: EventEnvelope, data: T): AOPEvent<T> {
  return {
    type,
    ts: new Date().toISOString(),
    session_id: env.session_id,
    agent: env.agent,
    ...(env.seq !== undefined ? { seq: env.seq } : {}),
    data,
    ...(env.ext ? { ext: env.ext } : {}),
  }
}

export const sessionStartEvent = (env: EventEnvelope, data: SessionStartData = {}) =>
  makeEvent('session.start', env, data)

export const sessionEndEvent = (env: EventEnvelope, data: SessionEndData) =>
  makeEvent('session.end', env, data)

export const messageEvent = (env: EventEnvelope, data: MessageData) =>
  makeEvent('message', env, data)

export const messageDeltaEvent = (env: EventEnvelope, data: MessageDeltaData) =>
  makeEvent('message.delta', env, data)

export const toolCallEvent = (env: EventEnvelope, data: ToolCallData) =>
  makeEvent('tool.call', env, data)

export const toolResultEvent = (env: EventEnvelope, data: ToolResultData) =>
  makeEvent('tool.result', env, data)

export const usageEvent = (env: EventEnvelope, data: UsageData) =>
  makeEvent('usage', env, data)

export const turnStartEvent = (env: EventEnvelope, data: TurnStartData) =>
  makeEvent('turn.start', env, data)

export const turnEndEvent = (env: EventEnvelope, data: TurnEndData) =>
  makeEvent('turn.end', env, data)

export const errorEvent = (env: EventEnvelope, data: ErrorData) =>
  makeEvent('error', env, data)

export const statusEvent = (env: EventEnvelope, data: StatusData) =>
  makeEvent('status', env, data)
