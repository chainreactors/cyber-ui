/* eslint-disable */
/** Generated from JSON Schema. DO NOT EDIT. */

export interface HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaExtAopSchemaJson {
  [k: string]: unknown
}
/**
 * This interface was referenced by `HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaExtAopSchemaJson`'s JSON-Schema
 * via the `definition` "messageMeta".
 */
export interface MessageMeta {
  agent_id?: string
  metadata?: {
    [k: string]: unknown
  }
}
/**
 * This interface was referenced by `HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaExtAopSchemaJson`'s JSON-Schema
 * via the `definition` "budgetWarning".
 */
export interface BudgetWarning {
  context_tokens: number
  token_budget: number
}
/**
 * This interface was referenced by `HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaExtAopSchemaJson`'s JSON-Schema
 * via the `definition` "llmRequest".
 */
export interface LLMRequest {
  model: string
  messages: number
  max_tokens: number
  stream: boolean
}
