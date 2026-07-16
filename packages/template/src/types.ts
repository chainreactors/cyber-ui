import type { ReactNode } from 'react'

export type TemplateRuleKind = 'matcher' | 'extractor'

export type TemplateRuleDefinition = Record<string, unknown> & {
  name?: string
  type?: string
  part?: string
}

export interface TemplateRuleEntry {
  key: string
  values: string[]
}

export interface NucleiHttpTemplate {
  id: string
  method?: string
  path: string[]
  matchersCondition?: string
  matchers: TemplateRuleDefinition[]
  extractors: TemplateRuleDefinition[]
}

export interface NucleiTemplateModel {
  id?: string
  name?: string
  severity?: string
  author?: string
  description?: string
  tags: string[]
  references: string[]
  classification: Record<string, unknown>
  metadata: Record<string, unknown>
  http: NucleiHttpTemplate[]
  raw?: string
  parseError?: string
}

export interface NucleiTemplatePanelLabels {
  title: string
  template: string
  author: string
  severity: string
  cve: string
  cwe: string
  tags: string
  references: string
  metadata: string
  httpFlow: string
  matchers: string
  extractors: string
  result: string
  definition: string
  noTemplate: string
  noRules: string
}

export interface NucleiTemplatePanelProps {
  rawContent?: string
  template?: Partial<NucleiTemplateModel>
  fallback?: Partial<NucleiTemplateModel>
  matcherResults?: unknown
  extractorResults?: unknown
  labels?: Partial<NucleiTemplatePanelLabels>
  className?: string
  status?: POCStatusValue
  source?: string
  createdAt?: Date | string | number | null
  updatedAt?: Date | string | number | null
  result?: Partial<ScanResultData>
}

export interface TemplateRuleDetail {
  kind: TemplateRuleKind
  name: string
  definition?: TemplateRuleDefinition
  values: string[]
}

export type POCStatusValue = 'active' | 'pending' | 'draft' | 'inactive' | 'deprecated' | 'deleted'

export interface CyberHubPocTemplate {
  id?: string | number
  poc_id?: string
  name?: string
  severity?: string
  status?: POCStatusValue | string
  author?: string
  source?: string
  type?: string
  format?: string
  version?: string
  raw_content?: string
  raw_content_draft?: string
  cve?: string
  tags?: string[]
  categories?: string[]
  info?: Record<string, unknown>
  link?: unknown
  created_at?: Date | string | number | null
  updated_at?: Date | string | number | null
}

export interface ScanResultData {
  poc?: CyberHubPocTemplate
  poc_name?: string
  vulnerable?: boolean
  vulnerability?: Record<string, unknown>
  error?: string
  matchers?: Record<string, unknown>
  extractors?: Record<string, unknown>
}

export interface ResultCardProps {
  result: ScanResultData
  index: number
  onViewPoc?: (poc: CyberHubPocTemplate) => void
  onRescan?: (poc: CyberHubPocTemplate) => void
}

export interface CyberHubPocTemplateViewerProps {
  poc: CyberHubPocTemplate
  result?: ScanResultData
  className?: string
  showResultCard?: boolean
  testPanel?: ReactNode
  associationPanel?: ReactNode
  metadataPanel?: ReactNode
  bottomActions?: ReactNode
  compareAction?: ReactNode
}
