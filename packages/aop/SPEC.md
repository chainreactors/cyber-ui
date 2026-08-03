# Agent Orchestration Protocol

This document is normative. The words MUST, MUST NOT, SHOULD, and MAY are used
as defined by RFC 2119.

## Scope

AOP defines provider-neutral Agent orchestration semantics, including Agent
registration, Session/Turn lifecycle, Event, File, Exec, PTY, Tool progress and
SCO transport. It does not define product management RPCs, persistence engines,
or product-specific DTOs.

Protobuf under `proto/aop` is the only schema. Protobuf binary and standard
Protobuf JSON are encodings of the same messages, not separate protocols.

## Identity and ordering

- Client-supplied request, session, turn, message, and tool-call IDs MUST remain
  unchanged across transports.
- AOP operations use `Envelope.id` as their request and correlation identity.
  Product management RPCs MAY define their own `request_id` for idempotency.
- `Event.seq` MUST start at 1 and increase strictly within one session. Relays
  MUST preserve it. An event with a zero sequence is not a published AOP event.
- A service that must synthesize a terminal event after losing the bound node
  MUST continue the last observed session sequence and MUST suppress a later
  duplicate terminal event for the same turn.
- A delivery cursor is an opaque store position and MUST NOT be interpreted as
  `Event.seq`.
- Retrying an AOP request with the same `Envelope.id` MUST return the same acceptance
  outcome and MUST NOT create another logical operation.
- Reusing an `Envelope.id` with a different message or body MUST be
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

- Protobuf package names are namespaces. `Any.type_url` is the only type
  identity; a separate namespace/type string MUST NOT be added.
- Independently routed namespaces MUST expose one `<namespace>.ProtocolMessage`
  and travel in `Envelope.payload`.
- AOP core extension slots MUST use `google.protobuf.Any` containing a concrete,
  generated namespace-owned protobuf message.
- `Event.extensions` is metadata attached to a core Event. `Event.extension` is
  the primary product-defined Event payload. They MUST NOT be conflated.
- One extension collection MUST NOT contain the same concrete `type_url` more
  than once. Collection order has no business meaning.
- Known protobuf messages MUST NOT be encoded as JSON bytes or `EncodedValue`.
- Unknown Any values MUST survive persistence, replay and relay unchanged.
- `EncodedValue` is limited to non-protobuf JSON such as Tool arguments and
  Tool JSON Schema.
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

## Namespace registration

- Applications MUST register supported top-level namespaces during assembly.
- Registration maps one protobuf full name to one local handler; it is not a
  global schema registry and owns no connection or operation lifecycle.
- Adding a business namespace MUST NOT modify `Envelope` or the AOP core oneof.
- Duplicate registration MUST fail. Unknown namespaces MUST produce an explicit
  protocol error and MUST NOT use JSON-shape fallback.
- Go and TypeScript implementations MAY use different local APIs, but MUST use
  the same protobuf full name and wire fixtures.
