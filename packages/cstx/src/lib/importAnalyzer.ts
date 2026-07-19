export type ImportDetectionKind =
  | 'snapshot'
  | 'bundle'
  | 'result'
  | 'results'
  | 'raw_artifact'
  | 'unknown'
  | 'archive'
  | 'conflict'

export type ImportValidationStatus = 'valid' | 'invalid'

export interface ArtifactOption {
  value: string
  label: string
}

export interface ImportFileEntry {
  id: string
  file: File
  analysisGuess: Exclude<ImportDetectionKind, 'conflict'>
  frontendGuess: ImportDetectionKind
  artifactType: string
  rawFormat: string
  matchedArtifacts: string[]
  validationStatus: ImportValidationStatus
  validationMessage: string | null
  previewTitle: string
  previewDetails: string[]
}

export const IMPORT_DETECTION_LABELS: Record<ImportDetectionKind, string> = {
  snapshot: 'Snapshot',
  bundle: 'Bundle',
  result: 'Result',
  results: 'Results',
  raw_artifact: 'Artifact',
  unknown: 'Unknown',
  archive: 'ZIP Archive',
  conflict: 'Ambiguous',
}

const ZIP_SIGNATURES = new Set(['504b0304', '504b0506', '504b0708'])

export function formatFileSize(file: File): string {
  const kb = file.size / 1024
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function keySummary(r: Record<string, unknown>): string {
  const keys = Object.keys(r)
  if (keys.length === 0) return 'fields: (empty)'
  const preview = keys.slice(0, 5).join(', ')
  return keys.length > 5 ? `fields: ${preview} …` : `fields: ${preview}`
}

function dataSummary(v: unknown): string {
  if (Array.isArray(v)) return `array of ${v.length} items`
  if (isRecord(v)) return `object with ${Object.keys(v).length} fields`
  if (v == null) return 'empty'
  return `type: ${typeof v}`
}

function matchArtifacts(filename: string, options: readonly ArtifactOption[], records?: unknown[]): string[] {
  const lower = filename.toLowerCase()
  const byName = options
    .filter((o) => {
      const raw = o.value.toLowerCase()
      const bare = raw.includes(':') ? (raw.split(':').pop() ?? raw) : raw
      return lower.includes(bare)
    })
    .map((o) => o.value)
  if (byName.length > 0) return byName

  // Content-based heuristic: inspect first non-config record for known field patterns
  if (records && records.length > 0) {
    const sample = records.find((r) => isRecord(r) && (r as Record<string, unknown>).port) as Record<string, unknown> | undefined
      ?? (isRecord(records[0]) ? records[0] as Record<string, unknown> : null)
    if (sample) {
      const has = (...keys: string[]) => keys.every((k) => k in sample)
      if (has('ip', 'port', 'protocol') && !('url' in sample && 'path' in sample)) {
        return options.some((o) => o.value === 'gogo') ? ['gogo'] : []
      }
      if (has('url', 'status') && ('path' in sample || 'source' in sample)) {
        return options.some((o) => o.value === 'spray') ? ['spray'] : []
      }
      if (has('host') && ('a' in sample || 'aaaa' in sample || 'cname' in sample)) {
        return options.some((o) => o.value === 'dnsx') ? ['dnsx'] : []
      }
      if (has('host') && !('port' in sample) && !('a' in sample) && Object.keys(sample).length <= 3) {
        return options.some((o) => o.value === 'subfinder') ? ['subfinder'] : []
      }
    }
  }
  return []
}

export function inferRawFormat(filename: string): string {
  const l = filename.toLowerCase()
  if (l.endsWith('.bundle') || l.endsWith('.jsonl')) return 'jsonl'
  if (l.endsWith('.ndjson')) return 'ndjson'
  if (l.endsWith('.yaml') || l.endsWith('.yml')) return 'yaml'
  if (l.endsWith('.csv')) return 'csv'
  if (l.endsWith('.cstx')) return 'cstx'
  if (l.endsWith('.zip')) return 'zip'
  return 'json'
}

export function requiresArtifactType(entry: ImportFileEntry): boolean {
  return (
    entry.frontendGuess === 'unknown' ||
    entry.frontendGuess === 'conflict' ||
    entry.analysisGuess === 'raw_artifact'
  )
}

type AnalysisFields = Pick<
  ImportFileEntry,
  'analysisGuess' | 'validationStatus' | 'validationMessage' | 'previewTitle' | 'previewDetails'
>

function analyzeStructured(doc: unknown, label: string): AnalysisFields {
  if (isRecord(doc)) {
    const t = typeof doc.type === 'string' ? doc.type.toLowerCase() : ''
    if (
      t === 'graph' ||
      isRecord(doc.graph) ||
      (Array.isArray(doc.nodes) && Array.isArray(doc.edges))
    ) {
      const g = isRecord(doc.graph) ? doc.graph : doc
      const nc = Array.isArray(g.nodes) ? g.nodes.length : 0
      const ec = Array.isArray(g.edges) ? g.edges.length : 0
      return {
        analysisGuess: 'snapshot',
        validationStatus: 'valid',
        validationMessage: null,
        previewTitle: `${label} Graph Snapshot`,
        previewDetails: [`${nc} nodes · ${ec} edges`, keySummary(doc)],
      }
    }
    if (t === 'results' || Array.isArray(doc.results)) {
      const n = Array.isArray(doc.results) ? doc.results.length : 0
      return {
        analysisGuess: 'results',
        validationStatus: 'valid',
        validationMessage: null,
        previewTitle: `${label} Result Set`,
        previewDetails: [`${n} results`, keySummary(doc)],
      }
    }
    if (t === 'result' || ('meta' in doc && 'data' in doc)) {
      return {
        analysisGuess: 'result',
        validationStatus: 'valid',
        validationMessage: null,
        previewTitle: `${label} Single Result`,
        previewDetails: [dataSummary(doc.data), keySummary(doc)],
      }
    }
    return {
      analysisGuess: 'raw_artifact',
      validationStatus: 'valid',
      validationMessage: null,
      previewTitle: `${label} Object`,
      previewDetails: [keySummary(doc)],
    }
  }

  if (Array.isArray(doc)) {
    const recs = doc.filter((i): i is Record<string, unknown> => isRecord(i))
    if (doc.length > 0 && recs.length === doc.length && recs.every((i) => 'meta' in i && 'data' in i)) {
      return {
        analysisGuess: 'results',
        validationStatus: 'valid',
        validationMessage: null,
        previewTitle: `${label} Result Array`,
        previewDetails: [`${doc.length} results`],
      }
    }
    return {
      analysisGuess: 'raw_artifact',
      validationStatus: 'valid',
      validationMessage: null,
      previewTitle: `${label} Array`,
      previewDetails: [`${doc.length} items`, recs[0] ? keySummary(recs[0]) : ''],
    }
  }

  return {
    analysisGuess: 'unknown',
    validationStatus: 'invalid',
    validationMessage: 'Root must be an object or array.',
    previewTitle: `${label} Invalid`,
    previewDetails: [],
  }
}

function splitCsvRow(line: string): string[] {
  const values: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQ = !inQ
      }
      continue
    }
    if (c === ',' && !inQ) {
      values.push(cur.trim())
      cur = ''
      continue
    }
    cur += c
  }
  values.push(cur.trim())
  return values
}

type TextAnalysis = AnalysisFields & { rawFormat: string; _records?: unknown[] }

async function analyzeText(file: File): Promise<TextAnalysis> {
  const rawFormat = inferRawFormat(file.name)
  const text = (await file.text()).trim()

  if (!text) {
    return { analysisGuess: 'unknown', rawFormat, validationStatus: 'invalid', validationMessage: 'File is empty.', previewTitle: 'Empty file', previewDetails: [] }
  }

  if (rawFormat === 'json') {
    try {
      return { rawFormat, ...analyzeStructured(JSON.parse(text), 'JSON') }
    } catch {
      // JSON.parse failed — the file may be JSONL with a .json extension (common
      // for tool output like gogo). Fall through to the JSONL branch instead of
      // rejecting outright.
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      if (lines.length > 1 && lines.every((l) => l.startsWith('{'))) {
        const records: unknown[] = []
        let ok = true
        for (const line of lines) {
          try { records.push(JSON.parse(line)) } catch { ok = false; break }
        }
        if (ok && records.length > 0) {
          return { rawFormat: 'jsonl', _records: records, ...analyzeStructured(records, 'JSONL') }
        }
      }
      return { analysisGuess: 'unknown', rawFormat, validationStatus: 'invalid', validationMessage: 'Not valid JSON or JSONL.', previewTitle: 'Invalid JSON', previewDetails: [] }
    }
  }

  if (rawFormat === 'jsonl' || rawFormat === 'ndjson' || rawFormat === 'cstx') {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const records: unknown[] = []
    const fmt = rawFormat.toUpperCase()
    for (let i = 0; i < lines.length; i++) {
      try {
        records.push(JSON.parse(lines[i]))
      } catch (e) {
        return { analysisGuess: 'unknown', rawFormat, validationStatus: 'invalid', validationMessage: `${fmt} line ${i + 1}: ${e instanceof Error ? e.message : e}`, previewTitle: `Invalid ${fmt}`, previewDetails: [] }
      }
    }
    const first = records[0]
    if (isRecord(first) && first.record_type === 'schema') {
      const bad = records.findIndex((r, i) => !isRecord(r) || (i === 0 ? r.record_type !== 'schema' : r.record_type !== 'checkpoint'))
      if (bad >= 0) {
        return { analysisGuess: 'unknown', rawFormat, validationStatus: 'invalid', validationMessage: `Bundle record ${bad + 1} has invalid type.`, previewTitle: `Invalid ${fmt} Bundle`, previewDetails: [] }
      }
      if (records.length < 2) {
        return { analysisGuess: 'unknown', rawFormat, validationStatus: 'invalid', validationMessage: 'Bundle has no checkpoint records.', previewTitle: `Invalid ${fmt} Bundle`, previewDetails: [] }
      }
      return { analysisGuess: 'bundle', rawFormat, validationStatus: 'valid', validationMessage: null, previewTitle: `${fmt} Bundle`, previewDetails: [`${lines.length} lines`, `${records.length - 1} checkpoints`] }
    }
    if (rawFormat === 'cstx') {
      return { analysisGuess: 'unknown', rawFormat, validationStatus: 'invalid', validationMessage: 'CSTX bundle must start with a schema record.', previewTitle: 'Invalid CSTX Bundle', previewDetails: [] }
    }
    return { rawFormat, _records: records, ...analyzeStructured(records, fmt) }
  }

  if (rawFormat === 'csv') {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length === 0) {
      return { analysisGuess: 'unknown', rawFormat, validationStatus: 'invalid', validationMessage: 'CSV has no data rows.', previewTitle: 'Invalid CSV', previewDetails: [] }
    }
    const headers = splitCsvRow(lines[0]).filter(Boolean)
    if (headers.length === 0) {
      return { analysisGuess: 'unknown', rawFormat, validationStatus: 'invalid', validationMessage: 'CSV header is empty.', previewTitle: 'Invalid CSV', previewDetails: [] }
    }
    return {
      analysisGuess: 'raw_artifact',
      rawFormat,
      validationStatus: 'valid',
      validationMessage: null,
      previewTitle: 'CSV Data',
      previewDetails: [
        `${Math.max(lines.length - 1, 0)} rows · ${headers.length} columns`,
        `cols: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? ' …' : ''}`,
      ],
    }
  }

  return { analysisGuess: 'unknown', rawFormat, validationStatus: 'invalid', validationMessage: `Unsupported format: .${rawFormat}`, previewTitle: 'Unsupported', previewDetails: [] }
}

async function analyzeArchive(file: File): Promise<TextAnalysis> {
  const buf = await file.arrayBuffer()
  const sig = Array.from(new Uint8Array(buf.slice(0, 4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const rawFormat = inferRawFormat(file.name)

  if (!ZIP_SIGNATURES.has(sig)) {
    return { analysisGuess: 'unknown', rawFormat, validationStatus: 'invalid', validationMessage: 'Not a valid ZIP file.', previewTitle: 'Invalid Archive', previewDetails: [] }
  }
  const isCstx = file.name.toLowerCase().endsWith('.cstx')
  return {
    analysisGuess: isCstx ? 'bundle' : 'archive',
    rawFormat,
    validationStatus: 'valid',
    validationMessage: null,
    previewTitle: isCstx ? 'CSTX Bundle Archive' : 'ZIP Archive',
    previewDetails: [formatFileSize(file)],
  }
}

export function buildImportEntry(
  file: File,
  analysis: Omit<ImportFileEntry, 'id' | 'file' | 'artifactType' | 'matchedArtifacts' | 'frontendGuess'> & { _records?: unknown[] },
  artifactOptions: readonly ArtifactOption[],
): ImportFileEntry {
  const matched = matchArtifacts(file.name, artifactOptions, analysis._records)
  const frontendGuess: ImportDetectionKind =
    (analysis.analysisGuess === 'unknown' || analysis.analysisGuess === 'raw_artifact') && matched.length > 1
      ? 'conflict'
      : analysis.analysisGuess
  return {
    id: `${file.name}:${file.size}:${file.lastModified}`,
    file,
    analysisGuess: analysis.analysisGuess,
    frontendGuess,
    artifactType: matched.length === 1 ? matched[0] : '',
    rawFormat: analysis.rawFormat,
    matchedArtifacts: matched,
    validationStatus: analysis.validationStatus,
    validationMessage: analysis.validationMessage,
    previewTitle: analysis.previewTitle,
    previewDetails: analysis.previewDetails,
  }
}

export async function analyzeImportFile(
  file: File,
  artifactOptions: readonly ArtifactOption[],
): Promise<ImportFileEntry> {
  const rawFormat = inferRawFormat(file.name)
  const analysis = rawFormat === 'zip' ? await analyzeArchive(file) : await analyzeText(file)
  return buildImportEntry(file, analysis, artifactOptions)
}

