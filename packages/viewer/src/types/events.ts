// LEGACY APG tier: Python-era event models. No in-repo consumers and no Go
// producer — AOP (lib/aop-reducer.ts) is the only live message implementation.
// Kept intact pending a consumer-side refactor to AOP.

/** TypeScript mirrors of Python Pydantic event models. */

// --- Runtime events ---

export interface ExecutionStartEvent {
  graph_name: string
  total_steps: number
}

export interface ExecutionCompleteEvent {
  step_count: number
  success: boolean
  error_message?: string | null
}

export interface NodeStartEvent {
  node_id: string
  node_name: string
  node_type: string
  step: number
  total: number
  prev_node?: string | null
  next_node?: string | null
}

export interface NodeInputEvent {
  node_id: string
  prompt: string
}

export interface NodeOutputEvent {
  node_id: string
  output: Record<string, unknown>
}

// --- Agent events ---

export interface ConversationTurnStartEvent {
  turn_id: string
  agent_name: string
  user_prompt: string
  system_prompt?: string | null
  timestamp: string
}

export interface TextPartEvent {
  turn_id: string
  agent_name: string
  content: string
  timestamp: string
}

export interface ToolCallPartEvent {
  turn_id: string
  agent_name: string
  tool_name: string
  args: Record<string, unknown>
  tool_call_id: string
  timestamp: string
}

export interface ToolReturnPartEvent {
  turn_id: string
  agent_name: string
  tool_name: string
  content: unknown
  tool_call_id: string
  timestamp: string
}

// --- Error events ---

export interface ErrorEvent {
  node_id: string
  node_name: string
  message: string
  category: string
  exception_type?: string | null
  stack_trace?: string | null
}

export interface PanicEvent {
  node_id: string
  node_name: string
  reason: string
  message: string
  stack_trace?: string | null
}
