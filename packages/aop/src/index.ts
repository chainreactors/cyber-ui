export * from './gen/aop/value_pb.js'
export * from './gen/aop/content_pb.js'
export * from './gen/aop/event_pb.js'
export * from './gen/aop/chat_pb.js'
export * from './gen/aop/envelope_pb.js'

export {
  AgentAcceptedSchema,
  AgentHelloSchema,
  AgentRuntimeInfoSchema,
  AgentStatsSchema,
  AgentStatusSchema,
  CancelOperationSchema,
  ProtocolMessageSchema as AOPProtocolMessageSchema,
  type ProtocolMessage as AOPProtocolMessage,
} from './gen/aop/protocol_pb.js'

export {
  ProtocolMessageSchema as FileProtocolMessageSchema,
  ResultSchema as FileResultSchema,
  type ProtocolMessage as FileProtocolMessage,
  type Result as FileResult,
} from './gen/aop/file/protocol_pb.js'
export {
  ProtocolMessageSchema as ExecProtocolMessageSchema,
  type ProtocolMessage as ExecProtocolMessage,
} from './gen/aop/exec/protocol_pb.js'
export {
  ProtocolMessageSchema as PtyProtocolMessageSchema,
  SessionSchema as PtySessionSchema,
  type ProtocolMessage as PtyProtocolMessage,
  type Session as PtySession,
} from './gen/aop/pty/protocol_pb.js'
export {
  ProtocolMessageSchema as ToolProtocolMessageSchema,
  type ProtocolMessage as ToolProtocolMessage,
} from './gen/aop/tool/protocol_pb.js'
export {
  ProtocolMessageSchema as SCOProtocolMessageSchema,
  type ProtocolMessage as SCOProtocolMessage,
} from './gen/aop/sco/protocol_pb.js'
export * from './client.js'

import { fromJson, type JsonValue } from '@bufbuild/protobuf'
import { EventSchema, type Event } from './gen/aop/event_pb.js'

export function eventFromJson(value: unknown): Event {
  return fromJson(EventSchema, value as JsonValue)
}
