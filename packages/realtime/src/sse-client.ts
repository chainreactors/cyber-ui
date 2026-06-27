export interface SseEvent {
  event: string
  data: unknown
}

export type SseEventListener = (event: SseEvent) => void

export async function streamSse(
  baseUrl: string,
  path: string,
  signal: AbortSignal,
  onEvent: SseEventListener,
): Promise<void> {
  const response = await fetch(joinUrl(baseUrl, path), {
    method: 'GET',
    signal,
  })
  if (!response.ok) {
    throw new Error(`SSE ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = ''
  let currentDataLines: string[] = []

  const flush = () => {
    if (!currentEvent || currentDataLines.length === 0) {
      currentEvent = ''
      currentDataLines = []
      return
    }
    const raw = currentDataLines.join('\n')
    let data: unknown = raw
    try {
      data = JSON.parse(raw)
    } catch {
      // Keep non-JSON SSE data as text.
    }
    onEvent({ event: currentEvent, data })
    currentEvent = ''
    currentDataLines = []
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const normalized = line.endsWith('\r') ? line.slice(0, -1) : line
      if (normalized === '') {
        flush()
      } else if (normalized.startsWith(':')) {
        continue
      } else if (normalized.startsWith('event:')) {
        currentEvent = normalized.slice(6).trimStart()
      } else if (normalized.startsWith('data:')) {
        currentDataLines.push(normalized.slice(5).trimStart())
      }
    }
  }
  flush()
}

export function joinUrl(baseUrl: string, path: string): string {
  const left = baseUrl.replace(/\/+$/, '')
  const right = path.replace(/^\/+/, '')
  return left ? `${left}/${right}` : `/${right}`
}
