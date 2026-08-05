import type { CstxReportPreview } from '@cyber/cstx'
import { normalizeReportVulnerability, type ReportVulnerabilityRecord } from './vulnerability.js'

export interface StandaloneReportOptions {
  title?: string
  lang?: string
  assetPreview?: CstxReportPreview | null
  vulnerabilities?: readonly ReportVulnerabilityRecord[] | null
  vulnerabilitiesTitle?: string
  vulnerabilitiesDescription?: string
}

const REPORT_EXPORT_CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

/**
 * Offline presentation for the same semantic component contract rendered by
 * ReportDocument in the application. It is deliberately self-contained: a
 * downloaded report must not depend on Cairn's runtime, Tailwind bundle, or a
 * network resource to remain readable.
 */
export const STANDALONE_REPORT_CSS = `
:root {
  color-scheme: light;
  --report-bg: #f6f8fa;
  --report-surface: #ffffff;
  --report-card: #f3f7fc;
  --report-border: rgba(59, 111, 206, 0.16);
  --report-border-subtle: rgba(59, 111, 206, 0.09);
  --report-text: #23456f;
  --report-muted: #4f6685;
  --report-dim: #6b7f99;
  --report-heading: #24519a;
  --report-accent: #1d5fd6;
  --report-accent-soft: rgba(59, 111, 206, 0.08);
  --report-green: #0f8a6e;
  --report-yellow: #9a6207;
  --report-red: #c53554;
  --report-orange: #c2410c;
  --report-purple: #7c5cbf;
  --report-shadow: 0 12px 36px rgba(12, 15, 20, 0.1), 0 0 0 1px rgba(59, 111, 206, 0.05);
  --report-sans: Inter, "Noto Sans SC", "PingFang SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --report-mono: "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

* { box-sizing: border-box; }
html { background: var(--report-bg); }
body {
  margin: 0;
  padding: 32px 20px;
  background: var(--report-bg);
  color: var(--report-text);
  font-family: var(--report-sans);
  font-size: 14px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.cyber-report {
  width: min(920px, 100%);
  margin: 0 auto;
  padding: 42px 48px 52px;
  border: 1px solid var(--report-border);
  border-radius: 16px;
  background: var(--report-surface);
  box-shadow: var(--report-shadow);
}

.cyber-report > :first-child { margin-top: 0; }
.cyber-report > :last-child { margin-bottom: 0; }
.cyber-report h1,
.cyber-report h2,
.cyber-report h3,
.cyber-report h4,
.cyber-report h5,
.cyber-report h6 {
  color: var(--report-heading);
  line-height: 1.3;
  text-wrap: balance;
}
.cyber-report h1 { margin: 4px 0 12px; color: var(--report-accent); font-size: 28px; letter-spacing: -0.02em; }
.cyber-report h2 { margin: 28px 0 10px; padding-bottom: 7px; border-bottom: 1px solid rgba(59, 111, 206, 0.2); font-size: 19px; }
.cyber-report h3 { margin: 22px 0 8px; font-size: 16px; }
.cyber-report h4 { margin: 18px 0 6px; font-size: 14px; }
.cyber-report h5,
.cyber-report h6 { margin: 14px 0 6px; color: var(--report-muted); font-size: 12px; }
.cyber-report p { margin: 10px 0; color: var(--report-muted); }
.cyber-report strong { color: var(--report-heading); }
.cyber-report a { color: var(--report-accent); text-underline-offset: 2px; }
.cyber-report a:hover { text-decoration-thickness: 2px; }
.cyber-report hr { margin: 24px 0; border: 0; border-top: 1px solid var(--report-border); }
.cyber-report ul,
.cyber-report ol { margin: 10px 0; padding-left: 24px; }
.cyber-report li { margin: 5px 0; }
.cyber-report li::marker { color: var(--report-dim); }
.cyber-report dl { margin: 10px 0; }
.cyber-report dt { margin-top: 10px; font-weight: 650; }
.cyber-report dd { margin-left: 20px; color: var(--report-muted); }

.cyber-report code,
.cyber-report kbd,
.cyber-report samp { font-family: var(--report-mono); font-size: 0.88em; }
.cyber-report :not(pre) > code,
.cyber-report kbd {
  padding: 2px 5px;
  border: 1px solid var(--report-border-subtle);
  border-radius: 5px;
  background: var(--report-card);
  color: var(--report-accent);
}
.cyber-report pre {
  margin: 10px 0;
  padding: 13px 15px;
  overflow-x: auto;
  border: 1px solid var(--report-border);
  border-radius: 9px;
  background: #f7faff;
  color: #263d5c;
  font-family: var(--report-mono);
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.cyber-report pre code { padding: 0; border: 0; background: transparent; color: inherit; }

.cyber-report table {
  width: 100%;
  margin: 12px 0;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  border: 1px solid var(--report-border);
  border-radius: 9px;
  font-size: 12.5px;
}
.cyber-report caption { padding: 9px 12px; text-align: left; font-weight: 650; }
.cyber-report thead { background: var(--report-card); color: var(--report-muted); }
.cyber-report th,
.cyber-report td { padding: 9px 12px; border-bottom: 1px solid var(--report-border); text-align: left; vertical-align: top; }
.cyber-report th { color: var(--report-heading); font-weight: 650; }
.cyber-report td { color: var(--report-muted); }
.cyber-report tr:last-child > th,
.cyber-report tr:last-child > td { border-bottom: 0; }
.cyber-report tbody tr:nth-child(even) { background: rgba(59, 111, 206, 0.035); }

.cyber-report blockquote {
  margin: 12px 0;
  padding: 10px 14px;
  border-left: 3px solid var(--report-accent);
  border-radius: 0 8px 8px 0;
  background: var(--report-accent-soft);
}
.cyber-report blockquote > :first-child { margin-top: 0; }
.cyber-report blockquote > :last-child { margin-bottom: 0; }
.cyber-report details { margin: 12px 0; padding: 10px 13px; border: 1px solid var(--report-border); border-radius: 8px; background: var(--report-card); }
.cyber-report summary { cursor: pointer; color: var(--report-heading); font-weight: 650; }

.cyber-report [data-report-component="section"] { margin: 18px 0; }
.cyber-report [data-report-component="finding-card"] { margin: 16px 0; padding: 16px 18px; border: 1px solid var(--report-border); border-top: 3px solid var(--report-dim); border-radius: 10px; background: var(--report-surface); }
.cyber-report [data-report-component="finding-card"][data-report-severity="critical"] { border-top-color: var(--report-red); }
.cyber-report [data-report-component="finding-card"][data-report-severity="high"] { border-top-color: var(--report-orange); }
.cyber-report [data-report-component="finding-card"][data-report-severity="medium"] { border-top-color: var(--report-yellow); }
.cyber-report [data-report-component="finding-card"][data-report-severity="low"] { border-top-color: var(--report-accent); }
.cyber-report [data-report-component="finding-card"][data-report-severity="info"] { border-top-color: var(--report-dim); }
.cyber-report [data-report-component="severity-badge"] { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; background: var(--report-card); color: var(--report-muted); font-size: 11px; font-weight: 700; line-height: 1.5; }
.cyber-report [data-report-component="severity-badge"][data-report-severity="critical"] { background: rgba(197, 53, 84, 0.12); color: var(--report-red); }
.cyber-report [data-report-component="severity-badge"][data-report-severity="high"] { background: rgba(194, 65, 12, 0.12); color: var(--report-orange); }
.cyber-report [data-report-component="severity-badge"][data-report-severity="medium"] { background: rgba(154, 98, 7, 0.12); color: var(--report-yellow); }
.cyber-report [data-report-component="severity-badge"][data-report-severity="low"] { background: var(--report-accent-soft); color: var(--report-accent); }
.cyber-report [data-report-component="http-evidence"] { margin: 14px 0; padding: 12px 14px; border: 1px solid var(--report-border); border-radius: 10px; background: #fbfdff; }
.cyber-report [data-report-component="http-evidence"] > h4:first-child { margin-top: 0; }
.cyber-report [data-report-component="data-table"] { display: table; }
.cyber-report [data-report-component="toc"] { margin: 14px 0; padding: 12px 16px; border: 1px solid var(--report-border); border-radius: 9px; background: var(--report-card); }
.cyber-report [data-report-component="callout"][data-report-tone="warn"] { border-left-color: var(--report-yellow); background: rgba(154, 98, 7, 0.08); }
.cyber-report [data-report-component="callout"][data-report-tone="danger"] { border-left-color: var(--report-red); background: rgba(197, 53, 84, 0.08); }
.cyber-report [data-report-component="callout"][data-report-tone="info"],
.cyber-report [data-report-component="callout"][data-report-tone="note"] { border-left-color: var(--report-accent); background: var(--report-accent-soft); }

.cyber-report [data-report-appendix="task-preview"] {
  margin: 22px 0;
  overflow: hidden;
  border: 1px solid rgba(59, 111, 206, 0.2);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(59, 111, 206, 0.1), rgba(59, 111, 206, 0.025) 44%, #fff);
}
.cyber-report [data-report-appendix="task-preview"] > header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 0;
  padding: 15px 17px;
  border: 0;
  border-bottom: 1px solid rgba(59, 111, 206, 0.16);
}
.cyber-report [data-report-appendix="task-preview"] h2 { margin: 2px 0 0; padding: 0; border: 0; color: var(--report-heading); font-size: 18px; }
.cyber-report .report-appendix-kicker { color: var(--report-accent); font-size: 10px; font-weight: 750; letter-spacing: 0.14em; text-transform: uppercase; }
.cyber-report .report-appendix-counts { display: flex; gap: 8px; margin-left: auto; }
.cyber-report .report-appendix-count { min-width: 62px; padding: 5px 10px; border: 1px solid rgba(59, 111, 206, 0.18); border-radius: 8px; background: rgba(255, 255, 255, 0.72); color: var(--report-accent); font-size: 18px; font-weight: 700; line-height: 1.1; text-align: center; }
.cyber-report .report-appendix-count small { display: block; margin-top: 3px; color: var(--report-dim); font-size: 9px; font-weight: 650; letter-spacing: 0.09em; text-transform: uppercase; }
.cyber-report .report-appendix-body { padding: 14px; }
.cyber-report .report-preview-tab-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.cyber-report .report-preview-tab-list { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; border: 1px solid var(--report-border-subtle); border-radius: 9px; background: var(--report-accent-soft); }
.cyber-report .report-preview-tab-label { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 6px; color: var(--report-muted); cursor: pointer; font-size: 11px; font-weight: 650; }
.cyber-report .report-preview-tab-label span { color: var(--report-dim); font-size: 10px; font-variant-numeric: tabular-nums; }
.cyber-report #report-preview-assets:checked ~ .report-preview-tab-list label[for="report-preview-assets"],
.cyber-report #report-preview-vulnerabilities:checked ~ .report-preview-tab-list label[for="report-preview-vulnerabilities"] { background: var(--report-surface); color: var(--report-accent); box-shadow: 0 1px 4px rgba(59, 111, 206, 0.12); }
.cyber-report .report-preview-panel { display: none; margin-top: 12px; }
.cyber-report #report-preview-assets:checked ~ .report-preview-panels [data-report-preview-panel="assets"],
.cyber-report #report-preview-vulnerabilities:checked ~ .report-preview-panels [data-report-preview-panel="vulnerabilities"] { display: block; }
.cyber-report .report-preview-sheet { margin: 0 0 12px; overflow: hidden; border: 1px solid var(--report-border); border-radius: 9px; background: #fff; }
.cyber-report .report-preview-sheet:last-child { margin-bottom: 0; }
.cyber-report .report-preview-sheet > header { display: flex; align-items: baseline; gap: 10px; margin: 0; padding: 9px 11px; border: 0; border-bottom: 1px solid var(--report-border); background: var(--report-card); }
.cyber-report .report-preview-sheet > header strong { color: var(--report-heading); font-size: 12px; }
.cyber-report .report-preview-sheet > header span { margin-left: auto; color: var(--report-dim); font-size: 10px; }
.cyber-report .report-preview-sheet table { margin: 0; border: 0; border-radius: 0; }
.cyber-report .report-preview-note { margin: 0; padding: 7px 11px; border-top: 1px solid var(--report-border); color: var(--report-dim); font-size: 10px; }

.cyber-report [data-report-preview="vulnerabilities"] > p:first-child { margin-top: 0; font-size: 11px; }
.cyber-report [data-report-vulnerability] { margin: 10px 0; padding: 0; overflow: hidden; border: 1px solid var(--report-border); border-radius: 10px; background: #fff; }
.cyber-report [data-report-vulnerability] > summary { display: flex; align-items: center; gap: 10px; padding: 11px 13px; background: var(--report-card); }
.cyber-report [data-report-vulnerability] > summary strong { min-width: 0; flex: 1; color: var(--report-heading); }
.cyber-report .report-severity { display: inline-flex; padding: 2px 7px; border-radius: 999px; background: var(--report-card); color: var(--report-muted); font-size: 10px; font-weight: 750; text-transform: uppercase; }
.cyber-report .report-severity[data-severity="critical"] { background: rgba(197, 53, 84, 0.12); color: var(--report-red); }
.cyber-report .report-severity[data-severity="high"] { background: rgba(194, 65, 12, 0.12); color: var(--report-orange); }
.cyber-report .report-severity[data-severity="medium"] { background: rgba(154, 98, 7, 0.12); color: var(--report-yellow); }
.cyber-report .report-severity[data-severity="low"] { background: var(--report-accent-soft); color: var(--report-accent); }
.cyber-report .report-vulnerability-body { padding: 13px 15px 15px; border-top: 1px solid var(--report-border); }
.cyber-report .report-vulnerability-narrative { margin: 10px 0; padding: 10px 12px; border: 1px solid var(--report-border-subtle); border-radius: 8px; background: var(--report-accent-soft); white-space: pre-wrap; }
.cyber-report .report-vulnerability-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 18px; margin: 12px 0; padding: 10px 12px; border: 1px solid var(--report-border); border-radius: 8px; background: rgba(240, 242, 245, 0.5); }
.cyber-report .report-vulnerability-fields dt { margin: 0; color: var(--report-dim); font-size: 9px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; }
.cyber-report .report-vulnerability-fields dd { margin: 2px 0 0; color: var(--report-text); font-size: 11px; }
.cyber-report .report-vulnerability-detail { margin-top: 10px; border: 1px solid var(--report-border); border-radius: 8px; background: #fbfdff; }
.cyber-report .report-vulnerability-detail > summary { padding: 8px 10px; color: var(--report-heading); font-size: 11px; }
.cyber-report .report-vulnerability-detail > div { padding: 0 10px 10px; }

@media (max-width: 680px) {
  body { padding: 0; }
  .cyber-report { padding: 26px 20px 34px; border: 0; border-radius: 0; box-shadow: none; }
  .cyber-report h1 { font-size: 23px; }
  .cyber-report table { display: block; overflow-x: auto; }
  .cyber-report .report-vulnerability-fields { grid-template-columns: 1fr; }
}

@media print {
  @page { margin: 16mm; }
  html,
  body { background: #fff; }
  body { padding: 0; }
  .cyber-report { width: 100%; padding: 0; border: 0; box-shadow: none; }
  .cyber-report pre,
  .cyber-report table,
  .cyber-report [data-report-component="finding-card"],
  .cyber-report [data-report-component="http-evidence"],
  .cyber-report [data-report-appendix="task-preview"],
  .cyber-report [data-report-vulnerability] { break-inside: avoid; }
}
`.trim()

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!)
}

function normalizeLang(value: string | undefined): string {
  const lang = value?.trim()
  return lang && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(lang) ? lang : 'en'
}

function valueText(value: unknown): string {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.map(valueText).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function renderExchange(exchange: Record<string, unknown>, index: number): string {
  const request = exchange.request && typeof exchange.request === 'object' ? exchange.request as Record<string, unknown> : {}
  const response = exchange.response && typeof exchange.response === 'object' ? exchange.response as Record<string, unknown> : {}
  const requestText = Object.keys(request).length ? JSON.stringify(request, null, 2) : ''
  const responseText = Object.keys(response).length ? JSON.stringify(response, null, 2) : ''
  return [
    `<section><h4>Exchange ${index + 1}</h4>`,
    requestText ? `<h5>Request</h5><pre><code>${escapeHtml(requestText)}</code></pre>` : '',
    responseText ? `<h5>Response</h5><pre><code>${escapeHtml(responseText)}</code></pre>` : '',
    '</section>',
  ].join('')
}

function renderVulnerability(record: ReportVulnerabilityRecord): string {
  const item = normalizeReportVulnerability(record)
  const narratives = [
    item.description ? `<section class="report-vulnerability-narrative"><h4>Description</h4>${escapeHtml(item.description)}</section>` : '',
    item.evidence.summary ? `<section class="report-vulnerability-narrative"><h4>Validation conclusion</h4>${escapeHtml(item.evidence.summary)}</section>` : '',
    item.evidence.impact ? `<section class="report-vulnerability-narrative"><h4>Impact</h4>${escapeHtml(item.evidence.impact)}</section>` : '',
    item.evidence.remediation ? `<section class="report-vulnerability-narrative"><h4>Remediation</h4>${escapeHtml(item.evidence.remediation)}</section>` : '',
  ].join('')
  const fields = [
    ['Target', item.target],
    ['Source', item.source],
    ['Rule', item.ruleId],
    ['Status', item.kind],
    ['Baseline', item.baselineState],
    ['Affected asset', item.assetId],
    ['Discovered', record.created_at],
    ['Updated', record.updated_at],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))
  const metadata = fields.length
    ? `<dl class="report-vulnerability-fields">${fields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`
    : ''
  const traffic = item.evidence.exchanges.length
    ? `<details class="report-vulnerability-detail"><summary>Traffic evidence · ${item.evidence.exchanges.length}</summary><div>${item.evidence.exchanges.map((exchange, index) => renderExchange(exchange as Record<string, unknown>, index)).join('')}</div></details>`
    : ''
  const template = item.evidence.template || item.evidence.templateRaw
    ? `<details class="report-vulnerability-detail"><summary>Rule template</summary><div><pre><code>${escapeHtml(item.evidence.templateRaw || JSON.stringify(item.evidence.template, null, 2))}</code></pre></div></details>`
    : ''
  return [
    `<details data-report-vulnerability="${escapeHtml(item.id)}" data-report-severity="${escapeHtml(item.severity)}">`,
    `<summary><span class="report-severity" data-severity="${escapeHtml(item.severity)}">${escapeHtml(item.severity)}</span><strong>${escapeHtml(item.title)}</strong></summary>`,
    '<div class="report-vulnerability-body">',
    narratives,
    metadata,
    traffic,
    template,
    '</div>',
    '</details>',
  ].join('')
}

function renderAssetSheets(preview: CstxReportPreview | null | undefined): string {
  if (!preview?.sheets?.length) return ''
  return preview.sheets.map((sheet) => {
    const columns = Array.isArray(sheet.columns) ? sheet.columns : []
    const rows = Array.isArray(sheet.rows) ? sheet.rows : []
    const head = columns.map((column) => `<th>${escapeHtml(column.title)}</th>`).join('')
    const body = rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(valueText(row[column.key]))}</td>`).join('')}</tr>`).join('')
    const note = sheet.preview_limit && sheet.total > rows.length
      ? `<p class="report-preview-note">Preview limited to ${sheet.preview_limit} rows.</p>`
      : ''
    return [
      '<section class="report-preview-sheet">',
      `<header><strong>${escapeHtml(sheet.title)}</strong><span>${rows.length} / ${sheet.total}</span></header>`,
      `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
      note,
      '</section>',
    ].join('')
  }).join('')
}

function renderVulnerabilityList(
  records: readonly ReportVulnerabilityRecord[],
  description: string | undefined,
): string {
  return [
    '<div data-report-preview="vulnerabilities">',
    description ? `<p>${escapeHtml(description)}</p>` : '',
    records.map(renderVulnerability).join(''),
    '</div>',
  ].join('')
}

function renderTaskPreview(options: StandaloneReportOptions): string {
  const preview = options.assetPreview
  const vulnerabilities = options.vulnerabilities?.length ? options.vulnerabilities : []
  const hasAssets = Boolean(preview?.sheets?.length)
  const hasVulnerabilities = vulnerabilities.length > 0
  if (!hasAssets && !hasVulnerabilities) return ''

  const assetTotal = preview?.sheets?.reduce(
    (sum, sheet) => sum + Math.max(0, Number(sheet.total) || 0),
    0,
  ) ?? 0
  const vulnerabilitiesTitle = options.vulnerabilitiesTitle || 'Vulnerabilities'
  const title = preview?.title || vulnerabilitiesTitle
  const assetTabTitle = preview?.sheets?.length === 1
    ? preview.sheets[0].title
    : 'CSTX assets'
  const assetSheets = renderAssetSheets(preview)
  const vulnerabilityList = renderVulnerabilityList(vulnerabilities, options.vulnerabilitiesDescription)
  const counts = [
    hasAssets ? `<div class="report-appendix-count">${assetTotal}<small>assets</small></div>` : '',
    hasVulnerabilities ? `<div class="report-appendix-count">${vulnerabilities.length}<small>findings</small></div>` : '',
  ].join('')

  const body = hasAssets && hasVulnerabilities
    ? [
        '<input class="report-preview-tab-input" type="radio" name="report-preview-tab" id="report-preview-assets" checked>',
        '<input class="report-preview-tab-input" type="radio" name="report-preview-tab" id="report-preview-vulnerabilities">',
        '<div class="report-preview-tab-list" role="tablist">',
        `<label class="report-preview-tab-label" for="report-preview-assets">${escapeHtml(assetTabTitle)}<span>${assetTotal}</span></label>`,
        `<label class="report-preview-tab-label" for="report-preview-vulnerabilities">${escapeHtml(vulnerabilitiesTitle)}<span>${vulnerabilities.length}</span></label>`,
        '</div>',
        '<div class="report-preview-panels">',
        `<section class="report-preview-panel" data-report-preview-panel="assets">${assetSheets}</section>`,
        `<section class="report-preview-panel" data-report-preview-panel="vulnerabilities">${vulnerabilityList}</section>`,
        '</div>',
      ].join('')
    : hasAssets ? assetSheets : vulnerabilityList

  return [
    '<section data-report-appendix="task-preview">',
    '<header>',
    `<div><div class="report-appendix-kicker">CSTX · Task preview</div><h2>${escapeHtml(title)}</h2>${preview?.query ? `<p><code>${escapeHtml(preview.query)}</code></p>` : ''}</div>`,
    `<div class="report-appendix-counts">${counts}</div>`,
    '</header>',
    `<div class="report-appendix-body">${body}</div>`,
    '</section>',
  ].join('')
}

function appendReportData(fragment: string, options: StandaloneReportOptions): string {
  const preview = renderTaskPreview(options)
  const normalized = fragment.trim()
  const header = /^<header\b(?=[^>]*data-report-component=["']report-header["'])[^>]*>([\s\S]*?)<\/header>/i.exec(normalized)
  if (!header) return `${preview}${normalized}`
  return `${header[1]}${preview}${normalized.slice(header[0].length)}`
}

/** Wrap a sanitized report-contract fragment as a portable HTML document. */
export function renderStandaloneReportHtml(
  fragment: string,
  options: StandaloneReportOptions = {},
): string {
  const title = escapeHtml(options.title?.trim() || 'Report')
  const lang = normalizeLang(options.lang)
  return [
    '<!doctype html>',
    `<html lang="${lang}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="referrer" content="no-referrer">',
    `<meta http-equiv="Content-Security-Policy" content="${REPORT_EXPORT_CSP}">`,
    `<title>${title}</title>`,
    `<style>${STANDALONE_REPORT_CSS}</style>`,
    '</head>',
    '<body>',
    '<main class="cyber-report" data-report-export="standalone">',
    appendReportData(fragment, options),
    '</main>',
    '</body>',
    '</html>',
    '',
  ].join('\n')
}
