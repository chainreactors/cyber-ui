import { useMemo, useState } from 'react'
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, ScrollArea } from '@cyber/ui'
import {
  AlertTriangle,
  CheckCircle,
  Download,
  ExternalLink,
  FileJson,
  RotateCcw,
  Target,
  XCircle,
} from 'lucide-react'
import yaml from 'js-yaml'
import type { CyberHubPocTemplate, ResultCardProps } from './types'
import { SeverityBadge } from './severity-badge'
import { JsonViewer } from './json-viewer'
import { MatcherDetailDialog } from './matcher-detail-dialog'

const normalizeRuleValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }

  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return null
}

const normalizeRuleValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeRuleValue(item))
      .filter((item): item is string => item !== null)
  }

  const normalized = normalizeRuleValue(value)
  return normalized === null ? [] : [normalized]
}

const normalizeRuleEntries = (source: unknown): Array<{ key: string; values: string[] }> => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return []

  return Object.entries(source).map(([key, value]) => ({
    key,
    values: normalizeRuleValues(value),
  }))
}

type PocYamlRuleDefinition = Record<string, unknown> & {
  name?: string
  type?: string
}

type PocYamlRequest = {
  matchers?: unknown
  extractors?: unknown
}

type PocYamlDocument = {
  http?: unknown
  requests?: unknown
  matchers?: unknown
  extractors?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const toRuleDefinitions = (value: unknown): PocYamlRuleDefinition[] => {
  const items = Array.isArray(value) ? value : value === undefined ? [] : [value]
  return items.filter(isRecord)
}

const toYamlRequests = (value: unknown): PocYamlRequest[] => {
  const items = Array.isArray(value) ? value : value === undefined ? [] : [value]
  return items.filter(isRecord)
}

export function ResultCard({ result, index, onViewPoc, onRescan }: ResultCardProps) {
  const poc = result.poc
  const isVulnerable = result.vulnerable || (isRecord(result.vulnerability) && Object.keys(result.vulnerability).length > 0)
  const hasError = Boolean(result.error)
  const title = poc?.name || result.poc_name || `POC #${index + 1}`

  const [showJsonDialog, setShowJsonDialog] = useState(false)
  const [matcherDetailDialog, setMatcherDetailDialog] = useState<{
    open: boolean
    type: 'matcher' | 'extractor'
    name: string
    values: string[]
    definition?: PocYamlRuleDefinition
  }>({
    open: false,
    type: 'matcher',
    name: '',
    values: [],
    definition: undefined,
  })

  const pocDefinitions = useMemo(() => {
    if (!poc?.raw_content) {
      return { matchers: [], extractors: [] }
    }

    try {
      const parsedValue = yaml.load(poc.raw_content)
      if (!isRecord(parsedValue)) {
        return { matchers: [], extractors: [] }
      }
      const parsed = parsedValue as PocYamlDocument

      const httpRequests = toYamlRequests(parsed.http || parsed.requests)
      const matchers: PocYamlRuleDefinition[] = []
      const extractors: PocYamlRuleDefinition[] = []

      httpRequests.forEach((req) => {
        matchers.push(...toRuleDefinitions(req.matchers))
        extractors.push(...toRuleDefinitions(req.extractors))
      })

      matchers.push(...toRuleDefinitions(parsed.matchers))
      extractors.push(...toRuleDefinitions(parsed.extractors))

      return { matchers, extractors }
    } catch (error) {
      console.error('Failed to parse POC YAML:', error)
      return { matchers: [], extractors: [] }
    }
  }, [poc?.raw_content])

  const matcherEntries = useMemo(
    () => normalizeRuleEntries(result.matchers),
    [result.matchers],
  )

  const extractorEntries = useMemo(
    () => normalizeRuleEntries(result.extractors),
    [result.extractors],
  )

  const getMatcherName = (matcher: PocYamlRuleDefinition, matcherIndex: number): string => {
    if (matcher.name) return matcher.name
    return `${matcher.type || 'matcher'}-${matcherIndex + 1}`
  }

  const getExtractorName = (extractor: PocYamlRuleDefinition, extractorIndex: number): string => {
    if (extractor.name) return extractor.name
    return `${extractor.type || 'extractor'}-${extractorIndex + 1}`
  }

  const findDefinition = (name: string, type: 'matcher' | 'extractor') => {
    const definitions = type === 'matcher' ? pocDefinitions.matchers : pocDefinitions.extractors
    const nameFunc = type === 'matcher' ? getMatcherName : getExtractorName

    for (let i = 0; i < definitions.length; i += 1) {
      if (nameFunc(definitions[i], i) === name) {
        return definitions[i]
      }
    }
    return undefined
  }

  const handleMatcherClick = (name: string, values: string[], type: 'matcher' | 'extractor') => {
    const definition = findDefinition(name, type)
    setMatcherDetailDialog({
      open: true,
      type,
      name,
      values,
      definition,
    })
  }

  const getCardColorClass = () => {
    if (isVulnerable) {
      return 'bg-red-50/80 dark:bg-red-950/20 border-red-300 dark:border-red-800'
    }
    if (hasError) {
      return 'bg-yellow-50/80 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800'
    }
    return 'bg-green-50/80 dark:bg-green-950/20 border-green-300 dark:border-green-800'
  }

  const matcherCount = matcherEntries.length
  const extractorCount = extractorEntries.length

  return (
    <div className={`rounded-lg border transition-all ${getCardColorClass()}`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {isVulnerable ? (
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              ) : hasError ? (
                <XCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              )}

              <span className="text-sm font-semibold truncate flex-1">{title}</span>

              {poc?.severity && <SeverityBadge severity={poc.severity} className="h-7 pointer-events-none" />}
            </div>

            {hasError && (
              <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1 font-mono break-words">
                {result.error}
              </div>
            )}

            {!hasError && isVulnerable && (matcherCount > 0 || extractorCount > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {matcherEntries.map(({ key, values }) => {
                  const hasDefinition = findDefinition(key, 'matcher') !== undefined
                  return (
                    <button
                      key={`matcher-${key}`}
                      type="button"
                      onClick={() => handleMatcherClick(key, values, 'matcher')}
                      className={`inline-flex items-center gap-1 bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-0.5 transition-colors cursor-pointer ${
                        hasDefinition
                          ? 'hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'opacity-75'
                      }`}
                      title={hasDefinition ? '点击查看详情' : '点击查看匹配结果（无 YAML 配置）'}
                    >
                      <Target className="h-3 w-3 text-red-600 dark:text-red-400" />
                      <span className="text-[10px] font-medium text-red-700 dark:text-red-400">{key}</span>
                      <span className="text-[10px] text-red-600 dark:text-red-500">
                        {values.length > 1 ? `${values.length} 项` : values[0] || '✓'}
                      </span>
                    </button>
                  )
                })}

                {extractorEntries.map(({ key, values }) => {
                  const hasDefinition = findDefinition(key, 'extractor') !== undefined
                  return (
                    <button
                      key={`extractor-${key}`}
                      type="button"
                      onClick={() => handleMatcherClick(key, values, 'extractor')}
                      className={`inline-flex flex-col bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-0.5 transition-colors cursor-pointer ${
                        hasDefinition
                          ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'opacity-75'
                      }`}
                      title={hasDefinition ? '点击查看详情' : '点击查看提取结果（无 YAML 配置）'}
                    >
                      <div className="flex items-center gap-1">
                        <Download className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">{key}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {values.slice(0, 3).map((val, idx) => (
                          <span key={idx} className="text-[9px] font-mono text-blue-600 dark:text-blue-500 bg-blue-100/50 dark:bg-blue-800/30 px-1 rounded">
                            {val.length > 20 ? `${val.substring(0, 20)}...` : val}
                          </span>
                        ))}
                        {values.length > 3 && (
                          <span className="text-[9px] text-blue-500">+{values.length - 3}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {!hasError && (
              <div className="flex items-center gap-2 flex-wrap">
                {poc?.poc_id && (
                  <Badge variant="outline" className="text-[9px] font-mono text-slate-600 dark:text-slate-400 border-slate-300 pointer-events-none">
                    {poc.poc_id}
                  </Badge>
                )}
                {poc?.cve && (
                  <Badge variant="outline" className="text-[9px] font-mono text-purple-600 dark:text-purple-400 border-purple-300 pointer-events-none">
                    {poc.cve}
                  </Badge>
                )}
                {poc?.tags && poc.tags.length > 0 && (
                  <>
                    {poc.tags.map((tag: string, tagIndex: number) => (
                      <Badge key={tagIndex} variant="secondary" className="text-[9px] pointer-events-none">
                        #{tag}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex gap-1.5">
            {poc && onRescan && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => onRescan(poc)}
                title="使用此 POC 快速复测"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setShowJsonDialog(true)}
              title="查看完整 JSON"
            >
              <FileJson className="h-3 w-3" />
            </Button>

            {poc && onViewPoc && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => onViewPoc(poc as CyberHubPocTemplate)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                查看详情
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              扫描结果详情 - {title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(80vh-100px)] pr-4">
            <JsonViewer
              data={{
                ...result,
                poc: undefined,
              }}
              showTypes={true}
              maxHeight="none"
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <MatcherDetailDialog
        open={matcherDetailDialog.open}
        onOpenChange={(open) =>
          setMatcherDetailDialog((prev) => ({ ...prev, open }))
        }
        type={matcherDetailDialog.type}
        name={matcherDetailDialog.name}
        matchedValues={matcherDetailDialog.values}
        yamlDefinition={matcherDetailDialog.definition}
      />
    </div>
  )
}
