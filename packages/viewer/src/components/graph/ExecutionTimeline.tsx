import { useEffect, useRef, useMemo, type CSSProperties } from 'react'
import { useAPGEvents } from '../../providers/APGWebSocketProvider'
import { useResolvedTheme } from '../../lib/use-resolved-theme'
import { reduceTimeline } from '../../lib/event-reducer'
import type { TimelineEntry } from '../../lib/event-reducer'
import {
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  Circle,
  Zap,
} from 'lucide-react'

const iconColors: Record<string, string> = {
  info: '#6b7280',
  running: '#60a5fa',
  success: '#4ade80',
  error: '#f87171',
}

const iconSize: CSSProperties = { width: 14, height: 14 }

const StatusIcon = ({ status }: { status: string }) => {
  const color = iconColors[status] ?? '#6b7280'
  const s = { ...iconSize, color }
  switch (status) {
    case 'running': return <PlayCircle style={s} />
    case 'success': return <CheckCircle2 style={s} />
    case 'error': return <AlertCircle style={s} />
    default: return <Circle style={s} />
  }
}

export interface ExecutionTimelineProps {
  entries: TimelineEntry[]
  isDark?: boolean
}

export default function ExecutionTimeline({ entries, isDark: isDarkProp }: ExecutionTimelineProps) {
  const isDark = useResolvedTheme(isDarkProp)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  }

  const scrollStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '8px 12px',
  }

  const emptyStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: 12,
    color: '#6b7280',
  }

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 4,
    transition: 'background 0.15s',
  }

  return (
    <div style={containerStyle}>
      <div style={scrollStyle}>
        {entries.length === 0 && (
          <div style={emptyStyle}>
            <Zap style={{ width: 14, height: 14, marginRight: 6 }} />
            Waiting for execution...
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entries.map((entry) => (
            <div key={entry.id} style={rowStyle}>
              <div style={{ marginTop: 2, flexShrink: 0 }}>
                <StatusIcon status={entry.status} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isDark ? '#e5e7eb' : '#1f2937',
                }}>
                  {entry.label}
                </div>
                <div style={{
                  fontSize: 10,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isDark ? '#6b7280' : '#9ca3af',
                }}>
                  {entry.detail}
                </div>
              </div>
              <span style={{ fontSize: 9, color: '#4b5563', flexShrink: 0, marginTop: 2 }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

/** Connected wrapper — pulls data from useAPGEvents() hook (requires APGWebSocketProvider). */
export function ConnectedTimeline({ isDark }: { isDark?: boolean }) {
  const { events } = useAPGEvents()
  const entries = useMemo(() => reduceTimeline(events), [events])
  return <ExecutionTimeline entries={entries} isDark={isDark} />
}
