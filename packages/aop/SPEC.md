# Agent Orchestration Protocol

This document is normative. The words MUST, MUST NOT, SHOULD, and MAY are used
as defined by RFC 2119.

## Scope

AOP defines provider-neutral chat orchestration semantics. It does not define
deployment topology, agent registration, filesystems, terminals, process
execution, persistence engines, or product telemetry.

Protobuf under `proto/aop` is the only schema. Protobuf binary and standard
Protobuf JSON are encodings of the same messages, not separate protocols.

## Identity and ordering

- Client-supplied request, session, turn, message, and tool-call IDs MUST remain
  unchanged across transports.
- Every mutating request MUST carry a non-empty `request_id`. Replay outcomes
  MUST survive a server restart; an in-memory cache alone is insufficient.
- `Event.seq` MUST start at 1 and increase strictly within one session. Relays
  MUST preserve it. An event with a zero sequence is not a published AOP event.
- A service that must synthesize a terminal event after losing the participant
  MUST continue the last observed session sequence and MUST suppress a later
  duplicate terminal event for the same turn.
- A delivery cursor is an opaque store position and MUST NOT be interpreted as
  `Event.seq`.
- Retrying a request with the same `request_id` MUST return the same acceptance
  outcome and MUST NOT create another logical operation.
- Reusing a `request_id` with a different method or request body MUST be
  rejected as a conflict.

## Lifecycle

- An accepted session MUST emit exactly one `session_started` and eventually
  exactly one `session_ended`.
- An accepted turn MUST emit exactly one `turn_started` and eventually exactly
  one `turn_ended`.
- A rejected run MUST NOT create a turn or emit turn events.
- Cancellation, timeout, provider failure, and disconnect MUST still converge
  an accepted turn on `turn_ended`.
- Disconnecting an event watcher MUST NOT cancel the session or turn it watches.
- A complete `message` is authoritative. Deltas are transient projections and
  MAY be discarded after the complete message is stored.
- Deltas and their complete message or tool call MUST share the same ID.
- Canonical message roles are `system`, `user`, `assistant`, and `tool`.
  Implementations MUST preserve an unknown non-empty role rather than coercing
  it to a canonical role.
- A tool result MUST reference an earlier tool call through `call_id`. Exactly
  one terminal tool result is permitted for each accepted tool call.

## RPC and delivery

- An accepted RPC response acknowledges ownership of the operation; generated
  events carry its progress and result.
- Validation and policy failures use the response `rejected` outcome. gRPC
  status errors are reserved for authentication, transport, or unavailable
  service failures where no application outcome can be produced.
- `WatchEvents.after_cursor` and `ListEvents.after_cursor` are exclusive.
  Deliveries after reconnect MUST retain their original event and cursor.
- Protobuf binary is used by gRPC. JSON transports and stores MUST use the
  standard protobuf JSON mapping without handwritten envelopes or field aliases.
- In protobuf JSON, `bytes` are base64 strings, enum names are symbolic, and
  oneof members use their generated JSON field names.

## Extensions and providers

- Shared additions SHOULD use a stable reverse-DNS extension namespace.
- A message MUST NOT contain the same extension namespace more than once.
- Extension values containing another protobuf message MUST use that message's
  standard protobuf JSON bytes and identify it with `media_type`.
- Unknown content SHOULD use `OpaqueContent`; unknown event semantics SHOULD
  use `ExtensionEvent`.
- A provider bridge claiming lossless support MUST emit every exact provider
  request/response frame as `ProviderFrame`, without parse/reserialize and in
  wire order.
- Capturing or persisting provider frames MUST be policy-controlled because
  frames can include credentials, user data, or opaque reasoning.
- Authentication headers and credentials MUST NOT be copied into provider frame
  metadata. A raw payload MUST NOT be parsed and reserialized before capture.

## Compatibility

Field numbers MUST NOT be reused. Removed fields MUST be reserved. Additive
changes preserve field numbers and published meaning. Removed fields MUST be
reserved permanently.
