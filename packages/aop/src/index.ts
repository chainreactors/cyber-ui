export * from './gen/aop/value_pb.js'
export * from './gen/aop/content_pb.js'
export * from './gen/aop/event_pb.js'
export * from './gen/aop/chat_pb.js'
export * from './gen/aiscan/chat/session_pb.js'
export * from './gen/aiscan/scan/scan_pb.js'
export * from './gen/aiscan/transport/terminal_pb.js'

import { fromJson, type JsonValue } from '@bufbuild/protobuf'
import { EventSchema, type Event } from './gen/aop/event_pb.js'

export function eventFromJson(value: unknown): Event {
  return fromJson(EventSchema, value as JsonValue)
}
