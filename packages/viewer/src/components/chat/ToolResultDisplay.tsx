import type { Event, ToolResult } from '@cyber/aop'
import { Activity } from 'lucide-react'
import { observationActivity } from '../../lib/observations'
import { ObservationList, type ObservationLabels } from '../observability/ObservationDisplay'
import ToolCallDisplay, { type ToolCallDisplayProps } from './ToolCallDisplay'
import { RecordToolCallDisplay, type RecordToolCallLabels } from './RecordToolCallDisplay'
import { MediaPreview, type MediaPreviewLabels, type ToolMediaResolver } from './MediaPreview'

export interface ToolResultDisplayProps extends ToolCallDisplayProps {
  toolResult?: ToolResult
  resultEventId?: string
  resolveMedia?: ToolMediaResolver
  mediaLabels?: Partial<MediaPreviewLabels>
  recordLabels?: Partial<RecordToolCallLabels>
  observations?: readonly Event[]
  observationLabels?: ObservationLabels
}

/** The canonical typed AOP tool-result renderer for live events and replay. */
export function ToolResultDisplay(props: ToolResultDisplayProps) {
  const error = props.error ?? props.toolResult?.isError
  const related = props.observations ? observationActivity(props.observations, props.toolName).length : 0
  const observations = related ? <div className="p-3"><ObservationList events={props.observations!} toolName={props.toolName} labels={props.observationLabels} /></div> : undefined
  if (props.toolName === 'record') return <RecordToolCallDisplay {...props} error={error}>{props.children}{observations}</RecordToolCallDisplay>
  const result = props.result ?? props.toolResult?.output.flatMap(part => part.value.case === 'text' ? [part.value.value.text] : []).join('\n')
  const media = props.toolResult?.output.flatMap((part, index) => part.value.case === 'media' ? [
    <MediaPreview key={`${props.resultEventId}:${index}`} media={part.value.value} labels={props.mediaLabels}
      src={props.resolveMedia?.(part.value.value, index, props.resultEventId)}
      downloadURL={props.resolveMedia?.(part.value.value, index, props.resultEventId, true)} />,
  ] : [])
  return <ToolCallDisplay {...props} result={result} error={error} headerExtra={<>{props.headerExtra}
    {related > 0 && <span className="flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground" title={props.observationLabels?.related || 'Related observations'}><Activity className="h-3 w-3" />{related}</span>}
    {!!props.toolResult?.durationMs && <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{(Number(props.toolResult.durationMs) / 1000).toFixed(1)} s</span>}
  </>}>
    {props.children || media?.length || observations ? <>{props.children}{!!media?.length && <div className="space-y-3 p-3">{media}</div>}{observations}</> : undefined}
  </ToolCallDisplay>
}
