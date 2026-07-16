import type { ReactNode } from 'react'

export interface TrafficHighlightSource {
  match_results?: Array<{
    matched?: boolean
    conditions?: Array<{
      matched?: boolean
      locations?: Array<{ matched_text?: string | null }>
    }>
  }>
  poc_matchers?: Record<string, unknown>
  poc_extractors?: Record<string, unknown>
}

export interface TrafficHttpView {
  id: string | number
  method: string
  url: string
  hostPath: string
  status: number
  reason: string
  durationMs: number
  error?: string
  request: {
    method: string
    requestTarget: string
    httpVersion: string
    headers: [string, string][]
    body?: string
  }
  response: {
    httpVersion: string
    status: number
    reason: string
    headers: [string, string][]
    body?: string
  } | null
  highlightSource?: TrafficHighlightSource
}

export interface HttpViewPanelsProps {
  view: TrafficHttpView | null
  loading?: boolean
  error?: string | null
  responseHeaderExtra?: ReactNode
  emptyText?: string
  requestTitle?: string
  responseTitle?: string
}

export interface HighlightRange {
  start: number
  end: number
}

export interface TrafficRecordLike extends TrafficHighlightSource {
  id: number | string
  method: string
  scheme?: string
  host: string
  port?: number
  path: string
  url: string
  status_code: number
  reason?: string
  duration?: number
  error?: string
  req_headers?: [string, string][]
  req_body?: string
  resp_headers?: [string, string][]
  resp_body?: string
}

export interface MitmFlowLike {
  id: string
  request: {
    method: string
    scheme: string
    host: string
    port: number
    path: string
    http_version: string
    headers: [string, string][]
    content?: string
    timestamp_start: number
  }
  response?: {
    http_version: string
    status_code: number
    reason: string
    headers: [string, string][]
    content?: string
    timestamp_end?: number
  }
  error?: { msg: string }
}

export interface EvidenceExchangeLike {
  name?: string
  request?: {
    method?: string
    target?: string
    protocol?: string
    headers?: Record<string, string>
    body?: string
  }
  response?: {
    statusCode?: number
    reasonPhrase?: string
    protocol?: string
    headers?: Record<string, string>
    body?: string
  }
  matched?: boolean
}
