import { useMemo } from 'react'
import type { ToolResult } from '@cyber/aop'
import { Camera, Check, CircleX, Loader2, Video } from 'lucide-react'
import { Badge, DisclosureCard } from '@cyber/ui'
import { cn } from '@cyber/theme'
import { formatArgs } from '../../lib/tool-utils'
import { recordingInfo } from '../../lib/record-result'
import { MediaPreview, type MediaPreviewLabels, type ToolMediaResolver } from './MediaPreview'
import type { ToolCallDisplayProps } from './ToolCallDisplay'

export interface RecordToolCallLabels extends MediaPreviewLabels {
  title: string
  desktop: string
  window: string
  empty: string
  rawOutput: string
  duration: (seconds: string) => string
  frames: (count: number) => string
  actions: Record<string, string>
  states: Record<string, string>
}

const defaults: RecordToolCallLabels = {
  title: 'Recording', desktop: 'Desktop', window: 'Window', empty: 'No recordings', rawOutput: 'Raw output',
  download: 'Download', openImage: 'Open screenshot', unavailable: 'Media unavailable', loadFailed: 'Failed to load media',
  duration: seconds => `${seconds} s`, frames: count => `${count} frames`,
  actions: { screenshot: 'Screenshot', record: 'Record', start: 'Start recording', stop: 'Stop recording', status: 'Recording status' },
  states: { starting: 'Starting', recording: 'Recording', stopping: 'Stopping', completed: 'Completed', failed: 'Failed' },
}

export interface RecordToolCallDisplayProps extends ToolCallDisplayProps {
  toolResult?: ToolResult
  resultEventId?: string
  resolveMedia?: ToolMediaResolver
  recordLabels?: Partial<RecordToolCallLabels>
}

export function RecordToolCallDisplay({ toolArgs = '', result, pending, error, toolResult, resultEventId, resolveMedia, labels, recordLabels, className, children, defaultExpanded = true }: RecordToolCallDisplayProps) {
  const l = { ...defaults, ...recordLabels }
  const output = toolResult?.output
  const text = output ? output.flatMap(part => part.value.case === 'text' ? [part.value.value.text] : []).join('\n') : result || ''
  const infos = useMemo(() => recordingInfo(text), [text])
  let action = ''
  try { const value: unknown = JSON.parse(toolArgs); if (value && typeof value === 'object' && 'action' in value && typeof value.action === 'string') action = value.action } catch { /* Show malformed arguments below. */ }
  const Icon = action === 'screenshot' ? Camera : Video
  return <DisclosureCard defaultExpanded={defaultExpanded} animated
    className={cn(error ? 'border-destructive/35' : pending ? 'border-warning/30' : 'border-border', className)}
    header={<>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Badge variant="outline" size="sm" className="font-mono">record</Badge>
      <span className="min-w-0 flex-1 truncate">{typeof l.actions[action] === 'string' ? l.actions[action] : l.title}</span>
      {error ? <CircleX className="h-3 w-3 text-destructive" /> : pending ? <Loader2 className="h-3 w-3 animate-spin text-warning" /> : <Check className="h-3 w-3 text-success" />}
    </>}>
    <div className="space-y-3 border-t border-border p-3" data-testid="record-result">
      {pending && <div role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{labels?.running || 'Running'}</div>}
      {infos.map((info, index) => {
        const target = info.target && typeof info.target === 'object' && !Array.isArray(info.target) ? info.target : undefined
        const state = textField(info.state)
        const id = textField(info.recording_id)
        const failure = textField(info.error)
        const width = numberField(target?.width), height = numberField(target?.height)
        const duration = numberField(info.duration_ms), fps = numberField(info.fps), frames = numberField(info.frames), bytes = numberField(info.bytes)
        return (
          <div key={id || index} className="space-y-1 text-xs" data-testid="record-status">
            <div className="flex flex-wrap items-center gap-2">
              {state && <Badge variant="secondary" size="sm">{typeof l.states[state] === 'string' ? l.states[state] : state}</Badge>}
              {id && <span className="break-all font-mono text-muted-foreground">{id}</span>}
              {target && <span>{textField(target.title) || (target.kind === 'window' ? l.window : l.desktop)}</span>}
            </div>
            <div className="flex flex-wrap gap-x-3 text-muted-foreground">
              {!!width && !!height && <span>{width} × {height}</span>}
              {duration !== undefined && <span>{l.duration((duration / 1000).toFixed(1))}</span>}
              {fps !== undefined && <span>{fps} FPS</span>}
              {frames !== undefined && <span>{l.frames(frames)}</span>}
              {bytes !== undefined && <span>{formatBytes(bytes)}</span>}
            </div>
            {failure && <p role="alert" className="break-words text-destructive">{failure}</p>}
          </div>
        )
      })}
      {action === 'status' && text.trim() === '[]' && <p className="text-xs text-muted-foreground">{l.empty}</p>}
      {error && !infos.some(info => textField(info.error)) && <p role="alert" className="whitespace-pre-wrap break-words text-xs text-destructive">{text || labels?.failed || 'Failed'}</p>}
      {output?.map((part, index) => part.value.case === 'media' && <MediaPreview key={`${resultEventId}:${index}`} media={part.value.value}
        src={resolveMedia?.(part.value.value, index, resultEventId)} downloadURL={resolveMedia?.(part.value.value, index, resultEventId, true)} labels={l} testIdPrefix="record" />)}
      {children}
      {toolArgs && <details><summary className="cursor-pointer text-xs text-muted-foreground">{labels?.arguments || 'Arguments'}</summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs">{formatArgs(toolArgs)}</pre></details>}
      {text && <details><summary className="cursor-pointer text-xs text-muted-foreground">{l.rawOutput}</summary>
        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs">{text}</pre></details>}
    </div>
  </DisclosureCard>
}

function textField(value: unknown): string { return typeof value === 'string' ? value : '' }
function numberField(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}
