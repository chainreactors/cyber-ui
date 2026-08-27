/// <reference path="../types/highlight-js.d.ts" />

import hljs from 'highlight.js/lib/core.js'
import bash from 'highlight.js/lib/languages/bash.js'
import c from 'highlight.js/lib/languages/c.js'
import cpp from 'highlight.js/lib/languages/cpp.js'
import css from 'highlight.js/lib/languages/css.js'
import go from 'highlight.js/lib/languages/go.js'
import java from 'highlight.js/lib/languages/java.js'
import javascript from 'highlight.js/lib/languages/javascript.js'
import json from 'highlight.js/lib/languages/json.js'
import markdown from 'highlight.js/lib/languages/markdown.js'
import powershell from 'highlight.js/lib/languages/powershell.js'
import python from 'highlight.js/lib/languages/python.js'
import rust from 'highlight.js/lib/languages/rust.js'
import shell from 'highlight.js/lib/languages/shell.js'
import sql from 'highlight.js/lib/languages/sql.js'
import typescript from 'highlight.js/lib/languages/typescript.js'
import xml from 'highlight.js/lib/languages/xml.js'
import yaml from 'highlight.js/lib/languages/yaml.js'

const CODE_LANGUAGE_BY_EXTENSION: Record<string, string> = {
  bat: 'batch', c: 'c', cc: 'cpp', cfg: 'ini', conf: 'ini', cpp: 'cpp',
  cs: 'csharp', css: 'css', dockerfile: 'dockerfile', env: 'bash', go: 'go',
  graphql: 'graphql', h: 'c', hpp: 'cpp', html: 'html', ini: 'ini', java: 'java',
  js: 'javascript', json: 'json', jsonl: 'json', jsx: 'jsx', kt: 'kotlin',
  lua: 'lua', mjs: 'javascript', php: 'php', proto: 'protobuf', ps1: 'powershell',
  py: 'python', rb: 'ruby', rs: 'rust', sh: 'bash', sql: 'sql', svelte: 'svelte',
  swift: 'swift', toml: 'toml', ts: 'typescript', tsx: 'tsx', vue: 'vue',
  xml: 'xml', yaml: 'yaml', yml: 'yaml', zig: 'zig',
}

const CODE_LANGUAGES = new Set(Object.values(CODE_LANGUAGE_BY_EXTENSION))
const AUTO_DETECT_LANGUAGES = [
  'bash', 'c', 'cpp', 'css', 'go', 'java', 'javascript', 'json',
  'markdown', 'powershell', 'python', 'rust', 'shell', 'sql', 'typescript',
  'xml', 'yaml',
]

const AUTO_LANGUAGE_ALIASES: Record<string, string> = {
  'c++': 'cpp',
  'c#': 'csharp',
  pgsql: 'sql',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
}

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('css', css)
hljs.registerLanguage('go', go)
hljs.registerLanguage('java', java)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('powershell', powershell)
hljs.registerLanguage('python', python)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)

export type ToolResultFormat =
  | { kind: 'markdown' }
  | { kind: 'code'; language: string; code?: string }
  | { kind: 'text' }

function formattedJson(value: string): string | undefined {
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed === null || typeof parsed !== 'object') return undefined
    return JSON.stringify(parsed, null, 2)
  } catch {
    return undefined
  }
}

function argPath(toolArgs: string): string | undefined {
  try {
    const args = JSON.parse(toolArgs) as Record<string, unknown>
    for (const key of ['path', 'file_path', 'filename']) {
      if (typeof args[key] === 'string' && args[key]) return args[key] as string
    }
  } catch {
    // Malformed arguments cannot identify a file.
  }
  return undefined
}

function pathResultFormat(toolArgs: string, result: string): ToolResultFormat | undefined {
  // A path only identifies a document when the result actually spans lines;
  // write/edit tools commonly return a one-line status for the same argument.
  if (!result.includes('\n')) return undefined
  const path = argPath(toolArgs)
  if (!path) return undefined
  const cleanPath = path.split(/[?#]/, 1)[0].toLowerCase()
  const fileName = cleanPath.split(/[\\/]/).pop() || ''
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1) : fileName
  if (extension === 'md' || extension === 'mdx' || extension === 'markdown') {
    return { kind: 'markdown' }
  }
  const language = CODE_LANGUAGE_BY_EXTENSION[extension]
  return language ? { kind: 'code', language } : undefined
}

function autoDetectedResultFormat(result: string): ToolResultFormat | undefined {
  const trimmed = result.trim()
  if (!trimmed || trimmed.length < 12) return undefined

  const detected = hljs.highlightAuto(trimmed, AUTO_DETECT_LANGUAGES)
  const rawLanguage = detected.language?.toLowerCase()
  if (!rawLanguage || detected.relevance < 3) return undefined
  const confidenceGap = detected.relevance - (detected.second_best?.relevance ?? 0)
  // Markdown is intentionally permissive, while code languages need a clear
  // lead over the runner-up to avoid painting ordinary command output as code.
  if (rawLanguage !== 'markdown' && confidenceGap < 1) return undefined
  const language = AUTO_LANGUAGE_ALIASES[rawLanguage] ?? rawLanguage
  if (language === 'markdown') return { kind: 'markdown' }
  if (!CODE_LANGUAGES.has(language)) return undefined
  return { kind: 'code', language }
}

/** Resolve the safest renderer without coupling the decision to a tool name. */
export function resolveToolResultFormat(toolArgs: string, result: string): ToolResultFormat {
  const jsonCode = formattedJson(result)
  if (jsonCode !== undefined) return { kind: 'code', language: 'json', code: jsonCode }
  return pathResultFormat(toolArgs, result) ?? autoDetectedResultFormat(result) ?? { kind: 'text' }
}
