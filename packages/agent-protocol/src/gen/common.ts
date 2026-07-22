/* eslint-disable */
/** Generated from JSON Schema. DO NOT EDIT. */

export interface HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaEventsCommonSchemaJson {
  [k: string]: unknown
}
/**
 * This interface was referenced by `HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaEventsCommonSchemaJson`'s JSON-Schema
 * via the `definition` "ext".
 */
export interface Ext {
  [k: string]: {
    [k: string]: unknown
  }
}
/**
 * This interface was referenced by `HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaEventsCommonSchemaJson`'s JSON-Schema
 * via the `definition` "imageSource".
 */
export interface ImageSource {
  path?: string
  base64?: string
  media_type?: string
}
/**
 * This interface was referenced by `HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaEventsCommonSchemaJson`'s JSON-Schema
 * via the `definition` "messagePart".
 */
export interface MessagePart {
  type: string
  text?: string
  image?: ImageSource
  [k: string]: unknown
}
/**
 * This interface was referenced by `HttpsGithubComChainreactorsCyberUiPackagesAgentProtocolSchemaEventsCommonSchemaJson`'s JSON-Schema
 * via the `definition` "usage".
 */
export interface UsageData {
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cache_read_tokens?: number
  cache_write_tokens?: number
  model?: string
  [k: string]: unknown
}
