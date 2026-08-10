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

import { createRegistry, fromJson, type JsonValue } from '@bufbuild/protobuf'
import { EnvelopeSchema, type Envelope } from './gen/aop/envelope_pb.js'
import { EventSchema, type Event } from './gen/aop/event_pb.js'
import { file_aop_protocol } from './gen/aop/protocol_pb.js'
import { file_aop_file_protocol } from './gen/aop/file/protocol_pb.js'
import { file_aop_exec_protocol } from './gen/aop/exec/protocol_pb.js'
import { file_aop_pty_protocol } from './gen/aop/pty/protocol_pb.js'
import { file_aop_tool_protocol } from './gen/aop/tool/protocol_pb.js'
import { file_aop_sco_protocol } from './gen/aop/sco/protocol_pb.js'

export const aopRegistry = createRegistry(
  file_aop_protocol,
  file_aop_file_protocol,
  file_aop_exec_protocol,
  file_aop_pty_protocol,
  file_aop_tool_protocol,
  file_aop_sco_protocol,
)

export function eventFromJson(value: unknown): Event {
  return fromJson(EventSchema, value as JsonValue, { registry: aopRegistry })
}

export function envelopeFromJson(value: unknown): Envelope {
  return fromJson(EnvelopeSchema, value as JsonValue, { registry: aopRegistry })
}
