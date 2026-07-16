import type { EvidenceExchangeLike, MitmFlowLike, TrafficHttpView, TrafficRecordLike } from './types'

function resolveRequestTarget(url: string, fallbackPath: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return fallbackPath || '/'
  }
}

function formatFlowUrl(flow: MitmFlowLike): string {
  const { scheme, host, port, path } = flow.request
  const defaultPort = scheme === 'https' ? 443 : 80
  const portStr = port !== defaultPort ? `:${port}` : ''
  return `${scheme}://${host}${portStr}${path}`
}

function calculateFlowDuration(flow: MitmFlowLike): number | null {
  if (!flow.response?.timestamp_end || !flow.request.timestamp_start) return null
  return Math.round((flow.response.timestamp_end - flow.request.timestamp_start) * 1000)
}

export function recordToHttpView(record: TrafficRecordLike): TrafficHttpView {
  return {
    id: record.id,
    method: record.method,
    url: record.url,
    hostPath: `${record.host}${record.path}`,
    status: record.status_code,
    reason: record.reason ?? '',
    durationMs: record.duration ?? -1,
    error: record.error,
    request: {
      method: record.method,
      requestTarget: resolveRequestTarget(record.url, record.path),
      httpVersion: 'HTTP/1.1',
      headers: record.req_headers ?? [],
      body: record.req_body,
    },
    response: record.status_code
      ? {
          httpVersion: 'HTTP/1.1',
          status: record.status_code,
          reason: record.reason ?? '',
          headers: record.resp_headers ?? [],
          body: record.resp_body,
        }
      : null,
    highlightSource: record,
  }
}

export function flowToHttpView(flow: MitmFlowLike): TrafficHttpView {
  const url = formatFlowUrl(flow)
  return {
    id: flow.id,
    method: flow.request.method,
    url,
    hostPath: url,
    status: flow.response?.status_code ?? 0,
    reason: flow.response?.reason ?? '',
    durationMs: calculateFlowDuration(flow) ?? -1,
    error: flow.error?.msg,
    request: {
      method: flow.request.method,
      requestTarget: flow.request.path,
      httpVersion: flow.request.http_version,
      headers: flow.request.headers,
      body: flow.request.content,
    },
    response: flow.response
      ? {
          httpVersion: flow.response.http_version,
          status: flow.response.status_code,
          reason: flow.response.reason,
          headers: flow.response.headers,
          body: flow.response.content,
        }
      : null,
    highlightSource: undefined,
  }
}

function headerRecordToPairs(headers?: Record<string, string>): [string, string][] {
  return Object.entries(headers ?? {})
}

export function evidenceExchangeToHttpView(exchange: EvidenceExchangeLike, index = 0, url?: string): TrafficHttpView {
  const requestTarget = exchange.request?.target || '/'
  const method = exchange.request?.method || 'GET'
  const status = exchange.response?.statusCode ?? 0

  return {
    id: exchange.name || index,
    method,
    url: url || requestTarget,
    hostPath: requestTarget,
    status,
    reason: exchange.response?.reasonPhrase || '',
    durationMs: -1,
    request: {
      method,
      requestTarget,
      httpVersion: exchange.request?.protocol || 'HTTP/1.1',
      headers: headerRecordToPairs(exchange.request?.headers),
      body: exchange.request?.body,
    },
    response: exchange.response
      ? {
          httpVersion: exchange.response.protocol || 'HTTP/1.1',
          status,
          reason: exchange.response.reasonPhrase || '',
          headers: headerRecordToPairs(exchange.response.headers),
          body: exchange.response.body,
        }
      : null,
    highlightSource: undefined,
  }
}
