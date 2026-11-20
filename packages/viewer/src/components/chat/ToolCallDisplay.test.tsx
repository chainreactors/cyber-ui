import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ToolCallDisplay, { type ToolCallSectionLabels } from './ToolCallDisplay'

const lineNumbers = (html: string) => (html.match(/react-syntax-highlighter-line-number/g) ?? []).length
const render = (result: string, options: { mode?: 'code'; language?: string } = {}) =>
  renderToStaticMarkup(
    <ToolCallDisplay toolName="bash" toolArgs={'{"command":"ls -la"}'} requestLanguage={options.language} result={result} defaultExpanded {...(options.mode ? { resultMode: options.mode } : {})} />,
  )
const renderWithLabels = (sectionLabels: ToolCallSectionLabels) =>
  renderToStaticMarkup(
    <ToolCallDisplay toolName="bash" toolArgs={'{"command":"ls -la"}'} result="ok" defaultExpanded sectionLabels={sectionLabels} />,
  )

describe('ToolCallDisplay copy buttons', () => {
  it('keeps both copy buttons when the host supplies no labels', () => {
    const html = render('ok')
    expect(html).toContain('aria-label="Copy arguments"')
    expect(html).toContain('aria-label="Copy result"')
  })

  it('uses the labels a host provides', () => {
    const html = renderWithLabels({ copyRequest: '复制请求', copyResponse: '复制响应', copied: '已复制' })
    expect(html).toContain('aria-label="复制请求"')
    expect(html).toContain('aria-label="复制响应"')
  })
})

describe('ToolCallDisplay result modes', () => {
  it('renders a Markdown result as a document without line numbers', () => {
    const html = render('# Findings\n\n[detail](https://example.test)')
    expect(html).toContain('<h1')
    expect(html).toContain('href="https://example.test"')
    expect(lineNumbers(html)).toBe(0)
  })

  it('frames the request and its response alike, showing Markdown as source', () => {
    const source = '# Findings\n\n| tool | status |\n| --- | --- |\n| nmap | done |'
    const html = render(source, { mode: 'code', language: 'bash' })
    const request = html.split('data-testid="tool-arguments"')[1]?.split('data-testid="tool-')[0] ?? ''
    const response = html.split('data-testid="tool-result"')[1] ?? ''

    expect(lineNumbers(request)).toBeGreaterThan(0)
    expect(lineNumbers(response)).toBeGreaterThan(0)
    expect(response).toContain('# Findings')
    expect(html).not.toContain('<h1')
    expect(html).not.toContain('<table')
  })
})
