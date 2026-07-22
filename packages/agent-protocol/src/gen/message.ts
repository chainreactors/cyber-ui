/* eslint-disable */
/** Generated from JSON Schema. DO NOT EDIT. */

export interface MessageData {
  message_id: string
  role: string
  parts: MessagePart[]
}
export interface MessagePart {
  type: string
  text?: string
  image?: ImageSource
}
export interface ImageSource {
  path?: string
  base64?: string
  media_type?: string
}
