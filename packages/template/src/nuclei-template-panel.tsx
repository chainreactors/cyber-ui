import { useMemo } from 'react'
import type { CyberHubPocTemplate, NucleiTemplatePanelProps, ScanResultData } from './types'
import { mergeTemplateFallback, parseNucleiTemplate } from './normalize'
import { CyberHubPocTemplateViewer } from './poc-template-viewer'

export function NucleiTemplatePanel({
  rawContent,
  template,
  fallback,
  matcherResults,
  extractorResults,
  className,
  status = 'active',
  source,
  createdAt,
  updatedAt,
  result,
}: NucleiTemplatePanelProps) {
  const parsed = useMemo(() => (rawContent ? parseNucleiTemplate(rawContent) : template), [rawContent, template])
  const model = useMemo(() => mergeTemplateFallback(parsed, fallback), [parsed, fallback])

  const poc = useMemo<CyberHubPocTemplate>(() => {
    const classification = model.classification ?? {}
    const metadata = model.metadata ?? {}
    const references = model.references?.length ? model.references : undefined
    const cve = classification['cve-id'] || classification.cve_id

    return {
      id: model.id || fallback?.id,
      poc_id: model.id || fallback?.id,
      name: model.name || fallback?.name || model.id || fallback?.id || 'POC',
      severity: model.severity || fallback?.severity || 'info',
      status,
      author: model.author || '未知',
      source: source || 'nuclei',
      type: 'http',
      format: 'yaml',
      raw_content: rawContent || model.raw || fallback?.raw || '',
      cve: typeof cve === 'string' ? cve : undefined,
      tags: model.tags ?? [],
      info: {
        classification,
        metadata,
        reference: references,
        verified: true,
      },
      created_at: createdAt,
      updated_at: updatedAt,
    }
  }, [createdAt, fallback, model, rawContent, source, status, updatedAt])

  const scanResult = useMemo<ScanResultData>(() => {
    const merged: ScanResultData = {
      poc,
      poc_name: poc.name,
      vulnerable: Boolean(matcherResults || extractorResults || result?.vulnerable),
      vulnerability: result?.vulnerability,
      error: result?.error,
      matchers: matcherResults as Record<string, unknown> | undefined,
      extractors: extractorResults as Record<string, unknown> | undefined,
      ...result,
    }
    return {
      ...merged,
      poc,
      poc_name: merged.poc_name || poc.name,
      matchers: merged.matchers ?? (matcherResults as Record<string, unknown> | undefined),
      extractors: merged.extractors ?? (extractorResults as Record<string, unknown> | undefined),
    }
  }, [extractorResults, matcherResults, poc, result])

  return (
    <CyberHubPocTemplateViewer
      poc={poc}
      result={scanResult}
      className={className}
      showResultCard={Boolean(scanResult.vulnerable || scanResult.error || scanResult.matchers || scanResult.extractors)}
    />
  )
}
