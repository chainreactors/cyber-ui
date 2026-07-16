import { parseDocument } from 'yaml'
import type {
  NucleiHttpTemplate,
  NucleiTemplateModel,
  TemplateRuleDefinition,
  TemplateRuleEntry,
  TemplateRuleKind,
} from './types'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(asString).filter((item): item is string => Boolean(item))
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function toRuleDefinitions(value: unknown): TemplateRuleDefinition[] {
  const items = Array.isArray(value) ? value : value === undefined ? [] : [value]
  return items.filter(isRecord)
}

function toHttpTemplates(value: unknown): NucleiHttpTemplate[] {
  const requests = Array.isArray(value) ? value : value === undefined ? [] : [value]
  return requests.filter(isRecord).map((request, index) => ({
    id: asString(request.id) || `http-${index + 1}`,
    method: asString(request.method),
    path: asStringArray(request.path),
    matchersCondition: asString(request['matchers-condition']),
    matchers: toRuleDefinitions(request.matchers),
    extractors: toRuleDefinitions(request.extractors),
  }))
}

function normalizeRuleValue(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return null
}

function normalizeRuleValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(normalizeRuleValue).filter((item): item is string => item !== null)
  }
  const normalized = normalizeRuleValue(value)
  return normalized === null ? [] : [normalized]
}

export function normalizeRuleEntries(source: unknown): TemplateRuleEntry[] {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return []
  return Object.entries(source).map(([key, value]) => ({ key, values: normalizeRuleValues(value) }))
}

export function getRuleDefinitionName(definition: TemplateRuleDefinition, index: number, kind: TemplateRuleKind): string {
  if (definition.name) return definition.name
  return `${definition.type || kind}-${index + 1}`
}

export function parseNucleiTemplate(rawContent: string): NucleiTemplateModel {
  try {
    const parsed = parseDocument(rawContent).toJSON()
    if (!isRecord(parsed)) {
      return { tags: [], references: [], classification: {}, metadata: {}, http: [], raw: rawContent, parseError: 'Template root is not an object' }
    }

    const info = asRecord(parsed.info)
    const classification = asRecord(info.classification)
    const metadata = asRecord(info.metadata)
    return {
      id: asString(parsed.id),
      name: asString(info.name) || asString(parsed.name),
      severity: asString(info.severity),
      author: asString(info.author),
      description: asString(info.description),
      tags: asStringArray(info.tags),
      references: asStringArray(info.reference),
      classification,
      metadata,
      http: toHttpTemplates(parsed.http),
      raw: rawContent,
    }
  } catch (error) {
    return {
      tags: [],
      references: [],
      classification: {},
      metadata: {},
      http: [],
      raw: rawContent,
      parseError: error instanceof Error ? error.message : 'Failed to parse template',
    }
  }
}

export function mergeTemplateFallback(
  parsed: Partial<NucleiTemplateModel> | undefined,
  fallback: Partial<NucleiTemplateModel> | undefined,
): NucleiTemplateModel {
  return {
    id: parsed?.id || fallback?.id,
    name: parsed?.name || fallback?.name,
    severity: parsed?.severity || fallback?.severity,
    author: parsed?.author || fallback?.author,
    description: parsed?.description || fallback?.description,
    tags: parsed?.tags?.length ? parsed.tags : fallback?.tags ?? [],
    references: parsed?.references?.length ? parsed.references : fallback?.references ?? [],
    classification: Object.keys(parsed?.classification ?? {}).length ? parsed!.classification! : fallback?.classification ?? {},
    metadata: Object.keys(parsed?.metadata ?? {}).length ? parsed!.metadata! : fallback?.metadata ?? {},
    http: parsed?.http?.length ? parsed.http : fallback?.http ?? [],
    raw: parsed?.raw || fallback?.raw,
    parseError: parsed?.parseError || fallback?.parseError,
  }
}

export function findRuleDefinition(
  model: NucleiTemplateModel,
  name: string,
  kind: TemplateRuleKind,
): TemplateRuleDefinition | undefined {
  const definitions = model.http.flatMap((request) => (kind === 'matcher' ? request.matchers : request.extractors))
  for (let index = 0; index < definitions.length; index += 1) {
    if (getRuleDefinitionName(definitions[index], index, kind) === name) return definitions[index]
  }
  return undefined
}
