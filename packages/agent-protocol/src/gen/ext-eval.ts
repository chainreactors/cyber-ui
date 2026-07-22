/* eslint-disable */
/** Generated from JSON Schema. DO NOT EDIT. */

export interface HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaExtEvalSchemaJson {
  [k: string]: unknown
}
/**
 * This interface was referenced by `HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaExtEvalSchemaJson`'s JSON-Schema
 * via the `definition` "control".
 */
export interface Control {
  criteria: string
  max_rounds?: number
}
/**
 * This interface was referenced by `HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaExtEvalSchemaJson`'s JSON-Schema
 * via the `definition` "detail".
 */
export interface Detail {
  round: number
  max_rounds: number
  pass?: boolean
  reason?: string
  error?: string
}
