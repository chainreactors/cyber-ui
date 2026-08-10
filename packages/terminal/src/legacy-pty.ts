export type LegacyPTYFrameType =
  | 'open'
  | 'opened'
  | 'input'
  | 'output'
  | 'resize'
  | 'list'
  | 'sessions'
  | 'attach'
  | 'attached'
  | 'detach'
  | 'detached'
  | 'kill'
  | 'close'
  | 'closed'
  | 'state'
  | 'error'

export interface LegacyPTYSession {
  id: string
  kind?: string
  name?: string
  command?: string
  state?: string
  pid?: number
}

export interface LegacyPTYFrame {
  type: LegacyPTYFrameType
  stream_id?: string
  session_id?: string
  kind?: string
  name?: string
  command?: string
  args?: string[]
  data?: string
  cols?: number
  rows?: number
  error?: string
  session?: LegacyPTYSession
  sessions?: LegacyPTYSession[]
}

const LEGACY_PTY_FRAME_TYPES = new Set<LegacyPTYFrameType>([
  'open',
  'opened',
  'input',
  'output',
  'resize',
  'list',
  'sessions',
  'attach',
  'attached',
  'detach',
  'detached',
  'kill',
  'close',
  'closed',
  'state',
  'error',
])

export function parseLegacyPTYFrame(value: string): LegacyPTYFrame | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const type = (parsed as { type?: unknown }).type
    return typeof type === 'string' && LEGACY_PTY_FRAME_TYPES.has(type as LegacyPTYFrameType)
      ? parsed as LegacyPTYFrame
      : null
  } catch {
    return null
  }
}

export function encodeLegacyPTYData(value: string): string {
  let binary = ''
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function decodeLegacyPTYData(value?: string): string {
  if (!value) return ''
  try {
    const binary = atob(value)
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
  } catch {
    return ''
  }
}
