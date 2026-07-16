import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@cyber/theme'
import type { HighlightRange, HttpViewPanelsProps, TrafficHttpView } from './types'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable'
import {
  collectHighlightTexts,
  findHighlightRanges,
  getStatusColor,
  normalizeHttpBodyForDisplay,
} from './traffic-detail'

function renderHighlightedText(text: string, ranges: HighlightRange[]): React.ReactNode[] {
  if (ranges.length === 0) return [text]

  const result: React.ReactNode[] = []
  let lastEnd = 0
  ranges.forEach((range, index) => {
    if (range.start > lastEnd) result.push(text.slice(lastEnd, range.start))
    result.push(
      <mark key={index} className="rounded bg-yellow-300 px-0.5 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100">
        {text.slice(range.start, range.end)}
      </mark>,
    )
    lastEnd = range.end
  })
  if (lastEnd < text.length) result.push(text.slice(lastEnd))
  return result
}

export function HttpViewPanels({
  view,
  loading,
  error,
  responseHeaderExtra,
  emptyText = '选择流量查看详情',
  requestTitle = 'Request',
  responseTitle = 'Response',
}: HttpViewPanelsProps) {
  const responseHeaderRight = view ? (
    <>
      {responseHeaderExtra}
      {view.status > 0 && (
        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', getStatusColor(view.status))}>
          {view.status}
        </span>
      )}
      <span className="text-xs text-muted-foreground">{view.durationMs >= 0 ? `${view.durationMs}ms` : '-'}</span>
    </>
  ) : undefined

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={25}>
        <HttpColumn title={requestTitle} view={view} loading={loading} error={error} type="request" emptyText={emptyText} bordered />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={25}>
        <HttpColumn
          title={responseTitle}
          view={view}
          loading={loading}
          error={error}
          type="response"
          emptyText={emptyText}
          headerRight={responseHeaderRight}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function HttpColumn({
  title,
  view,
  loading,
  error,
  type,
  bordered,
  headerRight,
  emptyText,
}: {
  title: string
  view: TrafficHttpView | null
  loading?: boolean
  error?: string | null
  type: 'request' | 'response'
  bordered?: boolean
  headerRight?: ReactNode
  emptyText: string
}) {
  return (
    <div className={cn('h-full flex flex-col', bordered && 'border-r')}>
      <div className="p-2 border-b bg-muted/30 shrink-0 flex items-center justify-between">
        <span className="font-medium text-sm">{title}</span>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-red-500 text-sm gap-2">
          <span>加载失败</span>
          <span className="text-xs text-muted-foreground">{error}</span>
        </div>
      ) : view ? (
        <div className="flex-1 overflow-auto">
          <RawHttpView view={view} type={type} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {emptyText}
        </div>
      )}
    </div>
  )
}

function RawHttpView({ view, type }: { view: TrafficHttpView; type: 'request' | 'response' }) {
  const highlightTexts = useMemo(() => collectHighlightTexts(view.highlightSource ?? {}), [view])
  if (type === 'request') return <RequestContent view={view} highlightTexts={highlightTexts} />
  return <ResponseContent view={view} highlightTexts={highlightTexts} />
}

function RequestContent({ view, highlightTexts }: { view: TrafficHttpView; highlightTexts: Set<string> }) {
  const requestLine = `${view.request.method} ${view.request.requestTarget} ${view.request.httpVersion}`
  const requestBody = normalizeHttpBodyForDisplay(view.request.body)

  return (
    <div className="p-3 font-mono text-xs leading-relaxed">
      <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
        {renderHighlightedText(requestLine, findHighlightRanges(requestLine, highlightTexts))}
      </div>
      {view.request.headers.map(([key, value], index) => {
        const headerLine = `${key}: ${value}`
        const ranges = findHighlightRanges(headerLine, highlightTexts)
        if (ranges.length > 0) return <div key={index}>{renderHighlightedText(headerLine, ranges)}</div>
        return (
          <div key={index}>
            <span className="text-blue-600 dark:text-blue-400">
              {renderHighlightedText(key, findHighlightRanges(key, highlightTexts))}
            </span>
            <span className="text-gray-500">: </span>
            <span className="text-gray-700 dark:text-gray-300">
              {renderHighlightedText(value, findHighlightRanges(value, highlightTexts))}
            </span>
          </div>
        )
      })}
      <div className="h-3" />
      {requestBody && (
        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all border-t border-dashed border-gray-300 dark:border-gray-600 pt-2">
          {renderHighlightedText(requestBody, findHighlightRanges(requestBody, highlightTexts))}
        </div>
      )}
    </div>
  )
}

function ResponseContent({ view, highlightTexts }: { view: TrafficHttpView; highlightTexts: Set<string> }) {
  if (view.error) {
    return (
      <div className="p-3 text-red-500 text-xs">
        <div className="font-medium mb-2">请求错误</div>
        <pre className="font-mono whitespace-pre-wrap">{view.error}</pre>
      </div>
    )
  }

  if (!view.status) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        请求进行中或无响应...
      </div>
    )
  }

  const response = view.response
  const statusLine = `${response?.httpVersion ?? 'HTTP/1.1'} ${view.status} ${view.reason || 'OK'}`
  const responseBody = normalizeHttpBodyForDisplay(response?.body)
  const statusColor =
    view.status >= 200 && view.status < 300
      ? 'text-green-600 dark:text-green-400'
      : view.status >= 300 && view.status < 400
        ? 'text-yellow-600 dark:text-yellow-400'
        : view.status >= 400 && view.status < 500
          ? 'text-orange-600 dark:text-orange-400'
          : view.status >= 500
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-600 dark:text-gray-400'

  return (
    <div className="p-3 font-mono text-xs leading-relaxed">
      <div className={`font-semibold ${statusColor}`}>
        {renderHighlightedText(statusLine, findHighlightRanges(statusLine, highlightTexts))}
      </div>
      {response?.headers.map(([key, value], index) => {
        const headerLine = `${key}: ${value}`
        const ranges = findHighlightRanges(headerLine, highlightTexts)
        if (ranges.length > 0) return <div key={index}>{renderHighlightedText(headerLine, ranges)}</div>
        return (
          <div key={index}>
            <span className="text-blue-600 dark:text-blue-400">
              {renderHighlightedText(key, findHighlightRanges(key, highlightTexts))}
            </span>
            <span className="text-gray-500">: </span>
            <span className="text-gray-700 dark:text-gray-300">
              {renderHighlightedText(value, findHighlightRanges(value, highlightTexts))}
            </span>
          </div>
        )
      })}
      <div className="h-3" />
      {responseBody ? (
        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all border-t border-dashed border-gray-300 dark:border-gray-600 pt-2">
          {renderHighlightedText(responseBody, findHighlightRanges(responseBody, highlightTexts))}
        </div>
      ) : (
        <div className="text-gray-400 dark:text-gray-500 italic border-t border-dashed border-gray-300 dark:border-gray-600 pt-2">
          (无响应体)
        </div>
      )}
    </div>
  )
}
