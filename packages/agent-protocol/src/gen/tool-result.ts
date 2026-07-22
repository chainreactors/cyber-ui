/* eslint-disable */
/** Generated from JSON Schema. DO NOT EDIT. */

export interface ToolResultData {
  tool_call_id: string
  tool_name?: string
  content: {
    [k: string]: unknown
  }
  is_error?: boolean
  duration_ms?: number
  details?: {
    [k: string]: unknown
  }
  terminate?: boolean
}
