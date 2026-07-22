/* eslint-disable */
/** Generated from JSON Schema. DO NOT EDIT. */

export interface SessionEndData {
  stop: string
  turns?: number
  error?: string
  usage?: UsageData
}
export interface UsageData {
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cache_read_tokens?: number
  cache_write_tokens?: number
  model?: string
}
