import type { ReactNode } from 'react'
import { CodeBlock } from './CodeBlock'
import { MarkdownContent } from './MarkdownContent'

export interface FileContentFormat {
  kind: 'markdown' | 'code'
  language?: string
}

export interface FileContentViewerProps {
  path: string
  content: string
  className?: string
  markdownClassName?: string
  showLineNumbers?: boolean
  copyable?: boolean
  unsupported?: ReactNode
}

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdown', 'mkdn'])
const CODE_LANGUAGES: Record<string, string> = {
  bash: 'bash',
  c: 'c',
  cc: 'cpp',
  cfg: 'plaintext',
  conf: 'plaintext',
  cpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  csv: 'plaintext',
  cxx: 'cpp',
  env: 'bash',
  go: 'go',
  h: 'c',
  hpp: 'cpp',
  html: 'markup',
  ini: 'ini',
  java: 'java',
  js: 'javascript',
  json: 'json',
  jsx: 'jsx',
  kt: 'kotlin',
  kts: 'kotlin',
  less: 'less',
  log: 'plaintext',
  lua: 'lua',
  mjs: 'javascript',
  php: 'php',
  properties: 'plaintext',
  ps1: 'powershell',
  py: 'python',
  pyw: 'python',
  r: 'r',
  rb: 'ruby',
  rs: 'rust',
  scala: 'scala',
  scss: 'scss',
  sh: 'bash',
  sql: 'sql',
  swift: 'swift',
  toml: 'toml',
  ts: 'typescript',
  tsx: 'tsx',
  txt: 'plaintext',
  xml: 'markup',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'bash',
}

const SPECIAL_FILE_LANGUAGES: Record<string, string> = {
  '.env': 'bash',
  '.gitignore': 'plaintext',
  'cmakelists.txt': 'cmake',
  dockerfile: 'docker',
  makefile: 'makefile',
}

export function fileContentFormat(path: string): FileContentFormat | null {
  const filename = path.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? ''
  const extension = filename.includes('.') ? filename.split('.').pop() ?? '' : ''
  if (MARKDOWN_EXTENSIONS.has(extension)) return { kind: 'markdown' }

  const language = SPECIAL_FILE_LANGUAGES[filename] ?? CODE_LANGUAGES[extension]
  return language ? { kind: 'code', language } : null
}

export function fencedCode(content: string, language?: string): string {
  const longestFence = Math.max(0, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length))
  const fence = '`'.repeat(Math.max(3, longestFence + 1))
  return `${fence}${language ?? ''}\n${content}\n${fence}`
}

export function FileContentViewer({
  path,
  content,
  className,
  markdownClassName,
  showLineNumbers = true,
  copyable = true,
  unsupported = null,
}: FileContentViewerProps) {
  const format = fileContentFormat(path)
  if (!format) return <>{unsupported}</>

  if (format.kind === 'code') {
    return (
      <div className={className}>
        <CodeBlock
          code={content}
          language={format.language ?? 'plaintext'}
          showLineNumbers={showLineNumbers}
          copyable={copyable}
        />
      </div>
    )
  }

  return (
    <MarkdownContent
      content={content}
      className={[className, markdownClassName].filter(Boolean).join(' ')}
    />
  )
}
