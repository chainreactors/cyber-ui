/* eslint-disable */
/** Generated from JSON Schema. DO NOT EDIT. */

export interface TurnEndData {
  stop: string
  error?: string
  usage?: UsageData
  context_tokens?: number
}
export interface UsageData {
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cache_read_tokens?: number
  cache_write_tokens?: number
  model?: string
}
