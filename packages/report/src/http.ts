import type { TrafficHttpView } from '@cyber/traffic'
import { evidenceExchangeToHttpView } from '@cyber/traffic'

/**
 * A report's HTTP evidence arrives as verbatim wire text, while the traffic
 * viewer wants a structured exchange. Parsing is deliberately total: anything
 * that is not recognisably an HTTP message returns `null` so the caller can
 * fall back to showing the bytes as-is. Evidence captured from a shell tool
 * (`curl …` plus its output) takes that path routinely — it is a first-class
 * outcome, not an error.
 */

export interface RawHttpMessage {
  startLine: string
  headers: Record<string, string>
  body?: string
}

const REQUEST_LINE = /^([A-Z]{3,10})\s+(\S+)(?:\s+(HTTP\/[\d.]+))?$/
const STATUS_LINE = /^(HTTP\/[\d.]+)\s+(\d{3})(?:\s+(.*))?$/

function splitMessage(raw: string): RawHttpMessage | null {
  const text = raw.replace(/\r\n/g, '\n')
  const separator = text.indexOf('\n\n')
  const head = separator === -1 ? text : text.slice(0, separator)
  const body = separator === -1 ? undefined : text.slice(separator + 2)

  const lines = head.split('\n').filter((line, index) => index === 0 || line.trim() !== '')
  const startLine = lines[0]?.trim()
  if (!startLine) return null

  const headers: Record<string, string> = {}
  for (const line of lines.slice(1)) {
    const colon = line.indexOf(':')
    // A header-looking line is required; anything else means this is not a
    // wire-format message (a shell transcript, most often).
    if (colon <= 0) return null
    headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return { startLine, headers, body }
}

/** Parse a verbatim request/response pair into a viewer-ready exchange. */
export function parseHttpExchange(
  requestText: string | undefined,
  responseText: string | undefined,
  index = 0,
): TrafficHttpView | null {
  const request = requestText ? splitMessage(requestText) : null
  if (!request) return null
  const requestMatch = REQUEST_LINE.exec(request.startLine)
  if (!requestMatch) return null

  const response = responseText ? splitMessage(responseText) : null
  const statusMatch = response ? STATUS_LINE.exec(response.startLine) : null
  if (responseText && !statusMatch) return null

  const host = request.headers.Host ?? request.headers.host
  const target = requestMatch[2]
  const url = host && !/^https?:\/\//i.test(target) ? `http://${host}${target}` : target

  return evidenceExchangeToHttpView(
    {
      request: {
        method: requestMatch[1],
        target,
        protocol: requestMatch[3] || 'HTTP/1.1',
        headers: request.headers,
        body: request.body,
      },
      response: statusMatch
        ? {
            protocol: statusMatch[1],
            statusCode: Number(statusMatch[2]),
            reasonPhrase: statusMatch[3] ?? '',
            headers: response!.headers,
            body: response!.body,
          }
        : undefined,
    },
    index,
    url,
  )
}
