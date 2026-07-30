import type { CstxReportPreview } from '@cyber/cstx'
import type { ReportSubreport } from './appendix'

export interface StandaloneReportOptions {
  title?: string
  lang?: string
  assetPreview?: CstxReportPreview | null
  subreports?: readonly ReportSubreport[] | null
  subreportsTitle?: string
  subreportsDescription?: string
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
  --report-text: #16243a;
  --report-muted: #45566e;
  --report-dim: #64748b;
  --report-accent: #3b6fce;
  --report-accent-soft: rgba(59, 111, 206, 0.08);
  --report-green: #0f8a6e;
  --report-yellow: #947614;
  --report-red: #c53554;
  --report-orange: #a66c12;
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
  color: var(--report-text);
  line-height: 1.3;
  text-wrap: balance;
}
.cyber-report h1 { margin: 4px 0 12px; color: var(--report-accent); font-size: 28px; letter-spacing: -0.02em; }
.cyber-report h2 { margin: 28px 0 10px; padding-bottom: 7px; border-bottom: 1px solid rgba(59, 111, 206, 0.2); color: #1d3f78; font-size: 19px; }
.cyber-report h3 { margin: 22px 0 8px; font-size: 16px; }
.cyber-report h4 { margin: 18px 0 6px; font-size: 14px; }
.cyber-report h5,
.cyber-report h6 { margin: 14px 0 6px; color: var(--report-muted); font-size: 12px; }
.cyber-report p { margin: 10px 0; color: var(--report-muted); }
.cyber-report strong { color: var(--report-text); }
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
  color: var(--report-text);
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
.cyber-report th { color: var(--report-text); font-weight: 650; }
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
.cyber-report summary { cursor: pointer; color: var(--report-text); font-weight: 650; }

.cyber-report [data-report-component="report-header"] {
  position: relative;
  margin-bottom: 22px;
  padding: 22px 24px 20px 28px;
  overflow: hidden;
  border: 1px solid rgba(59, 111, 206, 0.2);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(59, 111, 206, 0.12), rgba(59, 111, 206, 0.035) 58%, #fff);
  box-shadow: 0 8px 24px rgba(59, 111, 206, 0.08);
}
.cyber-report [data-report-component="report-header"]::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: linear-gradient(180deg, #3b6fce, #6f8fe0);
  content: "";
}
.cyber-report [data-report-component="report-header"] p { max-width: 72ch; }
.cyber-report [data-report-component="section"] { margin: 18px 0; }
.cyber-report [data-report-component="finding-card"] { margin: 16px 0; padding: 16px 18px; border: 1px solid var(--report-border); border-top: 3px solid var(--report-dim); border-radius: 10px; background: var(--report-surface); }
.cyber-report [data-report-component="finding-card"][data-report-severity="critical"] { border-top-color: var(--report-red); }
.cyber-report [data-report-component="finding-card"][data-report-severity="high"] { border-top-color: var(--report-orange); }
.cyber-report [data-report-component="finding-card"][data-report-severity="medium"] { border-top-color: var(--report-yellow); }
.cyber-report [data-report-component="finding-card"][data-report-severity="low"] { border-top-color: var(--report-accent); }
.cyber-report [data-report-component="finding-card"][data-report-severity="info"] { border-top-color: var(--report-dim); }
.cyber-report [data-report-component="severity-badge"] { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; background: var(--report-card); color: var(--report-muted); font-size: 11px; font-weight: 700; line-height: 1.5; }
.cyber-report [data-report-component="severity-badge"][data-report-severity="critical"] { background: rgba(197, 53, 84, 0.12); color: var(--report-red); }
.cyber-report [data-report-component="severity-badge"][data-report-severity="high"] { background: rgba(166, 108, 18, 0.12); color: var(--report-orange); }
.cyber-report [data-report-component="severity-badge"][data-report-severity="medium"] { background: rgba(148, 118, 20, 0.12); color: var(--report-yellow); }
.cyber-report [data-report-component="severity-badge"][data-report-severity="low"] { background: var(--report-accent-soft); color: var(--report-accent); }
.cyber-report [data-report-component="http-evidence"] { margin: 14px 0; padding: 12px 14px; border: 1px solid var(--report-border); border-radius: 10px; background: #fbfdff; }
.cyber-report [data-report-component="http-evidence"] > h4:first-child { margin-top: 0; }
.cyber-report [data-report-component="data-table"] { display: table; }
.cyber-report [data-report-component="toc"] { margin: 14px 0; padding: 12px 16px; border: 1px solid var(--report-border); border-radius: 9px; background: var(--report-card); }
.cyber-report [data-report-component="callout"][data-report-tone="warn"] { border-left-color: var(--report-yellow); background: rgba(148, 118, 20, 0.08); }
.cyber-report [data-report-component="callout"][data-report-tone="danger"] { border-left-color: var(--report-red); background: rgba(197, 53, 84, 0.08); }
.cyber-report [data-report-component="callout"][data-report-tone="info"],
.cyber-report [data-report-component="callout"][data-report-tone="note"] { border-left-color: var(--report-accent); background: var(--report-accent-soft); }

.cyber-report [data-report-appendix="asset-preview"] {
  margin: 22px 0;
  overflow: hidden;
  border: 1px solid rgba(59, 111, 206, 0.2);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(59, 111, 206, 0.1), rgba(59, 111, 206, 0.025) 44%, #fff);
}
.cyber-report [data-report-appendix="asset-preview"] > header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 0;
  padding: 15px 17px;
  border: 0;
  border-bottom: 1px solid rgba(59, 111, 206, 0.16);
}
.cyber-report [data-report-appendix="asset-preview"] h2 { margin: 2px 0 0; padding: 0; border: 0; color: #1d3f78; font-size: 18px; }
.cyber-report .report-appendix-kicker { color: var(--report-accent); font-size: 10px; font-weight: 750; letter-spacing: 0.14em; text-transform: uppercase; }
.cyber-report .report-appendix-count { margin-left: auto; padding: 5px 10px; border: 1px solid rgba(59, 111, 206, 0.18); border-radius: 8px; background: rgba(255, 255, 255, 0.72); color: var(--report-accent); font-size: 18px; font-weight: 700; line-height: 1.1; text-align: center; }
.cyber-report .report-appendix-count small { display: block; margin-top: 3px; color: var(--report-dim); font-size: 9px; font-weight: 650; letter-spacing: 0.09em; text-transform: uppercase; }
.cyber-report .report-appendix-body { padding: 14px; }
.cyber-report .report-preview-sheet { margin: 0 0 12px; overflow: hidden; border: 1px solid var(--report-border); border-radius: 9px; background: #fff; }
.cyber-report .report-preview-sheet:last-child { margin-bottom: 0; }
.cyber-report .report-preview-sheet > header { display: flex; align-items: baseline; gap: 10px; margin: 0; padding: 9px 11px; border: 0; border-bottom: 1px solid var(--report-border); background: var(--report-card); }
.cyber-report .report-preview-sheet > header strong { font-size: 12px; }
.cyber-report .report-preview-sheet > header span { margin-left: auto; color: var(--report-dim); font-size: 10px; }
.cyber-report .report-preview-sheet table { margin: 0; border: 0; border-radius: 0; }
.cyber-report .report-preview-note { margin: 0; padding: 7px 11px; border-top: 1px solid var(--report-border); color: var(--report-dim); font-size: 10px; }

.cyber-report [data-report-appendix="subreports"] { margin: 28px 0 0; }
.cyber-report [data-report-appendix="subreports"] > header { margin: 0 0 12px; padding: 0 0 8px; border: 0; border-bottom: 1px solid rgba(59, 111, 206, 0.2); }
.cyber-report [data-report-appendix="subreports"] > header h2 { display: inline; margin: 0; padding: 0; border: 0; color: var(--report-accent); font-size: 19px; }
.cyber-report [data-report-appendix="subreports"] > header span { margin-left: 7px; color: var(--report-dim); font-size: 11px; }
.cyber-report [data-report-appendix="subreport"] { margin: 10px 0; padding: 0; overflow: hidden; border: 1px solid var(--report-border); border-radius: 10px; background: #fff; }
.cyber-report [data-report-appendix="subreport"] > summary { display: flex; align-items: center; gap: 10px; padding: 11px 13px; background: var(--report-card); }
.cyber-report [data-report-appendix="subreport"] > summary strong { min-width: 0; flex: 1; color: var(--report-text); }
.cyber-report .report-severity { display: inline-flex; padding: 2px 7px; border-radius: 999px; background: var(--report-card); color: var(--report-muted); font-size: 10px; font-weight: 750; text-transform: uppercase; }
.cyber-report .report-severity[data-severity="critical"] { background: rgba(197, 53, 84, 0.12); color: var(--report-red); }
.cyber-report .report-severity[data-severity="high"] { background: rgba(166, 108, 18, 0.12); color: var(--report-orange); }
.cyber-report .report-severity[data-severity="medium"] { background: rgba(148, 118, 20, 0.12); color: var(--report-yellow); }
.cyber-report .report-severity[data-severity="low"] { background: var(--report-accent-soft); color: var(--report-accent); }
.cyber-report .report-subreport-body { padding: 13px 15px 15px; border-top: 1px solid var(--report-border); }
.cyber-report .report-subreport-body > p { white-space: pre-wrap; }
.cyber-report .report-subreport-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 18px; margin: 12px 0; padding: 10px 12px; border: 1px solid var(--report-border); border-radius: 8px; background: rgba(240, 242, 245, 0.5); }
.cyber-report .report-subreport-fields dt { margin: 0; color: var(--report-dim); font-size: 9px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; }
.cyber-report .report-subreport-fields dd { margin: 2px 0 0; color: var(--report-text); font-size: 11px; }

@media (max-width: 680px) {
  body { padding: 0; }
  .cyber-report { padding: 26px 20px 34px; border: 0; border-radius: 0; box-shadow: none; }
  .cyber-report h1 { font-size: 23px; }
  .cyber-report table { display: block; overflow-x: auto; }
  .cyber-report .report-subreport-fields { grid-template-columns: 1fr; }
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
  .cyber-report [data-report-appendix="asset-preview"],
  .cyber-report [data-report-appendix="subreport"] { break-inside: avoid; }
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

function renderAssetPreview(preview: CstxReportPreview | null | undefined): string {
  if (!preview?.sheets?.length) return ''
  const total = preview.sheets.reduce((sum, sheet) => sum + Math.max(0, Number(sheet.total) || 0), 0)
  const sheets = preview.sheets.map((sheet) => {
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
  return [
    '<section data-report-appendix="asset-preview">',
    '<header>',
    `<div><div class="report-appendix-kicker">CSTX · Asset preview</div><h2>${escapeHtml(preview.title)}</h2>${preview.query ? `<p><code>${escapeHtml(preview.query)}</code></p>` : ''}</div>`,
    `<div class="report-appendix-count">${total}<small>assets</small></div>`,
    '</header>',
    `<div class="report-appendix-body">${sheets}</div>`,
    '</section>',
  ].join('')
}

function safeHref(value: string | undefined): string | undefined {
  const href = value?.trim()
  if (!href) return undefined
  if (/^https?:\/\//i.test(href) || /^\/(?!\/)/.test(href) || href.startsWith('#')) return href
  return undefined
}

function renderSubreport(report: ReportSubreport): string {
  const severity = (report.severity || 'info').toLowerCase()
  const fields = report.fields?.length
    ? `<dl class="report-subreport-fields">${report.fields.map((field) => `<div><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(field.value)}</dd></div>`).join('')}</dl>`
    : ''
  const evidence = report.evidence?.map((item) => `<section><h4>${escapeHtml(item.label)}</h4><pre><code>${escapeHtml(item.content)}</code></pre></section>`).join('') ?? ''
  const href = safeHref(report.href)
  const link = href ? `<a href="${escapeHtml(href)}">${escapeHtml(report.hrefLabel || 'Open subreport')}</a>` : ''
  return [
    `<details data-report-appendix="subreport" data-report-severity="${escapeHtml(severity)}">`,
    `<summary><span class="report-severity" data-severity="${escapeHtml(severity)}">${escapeHtml(severity)}</span><strong>${escapeHtml(report.title)}</strong></summary>`,
    '<div class="report-subreport-body">',
    report.summary ? `<p>${escapeHtml(report.summary)}</p>` : '',
    fields,
    evidence,
    link,
    '</div>',
    '</details>',
  ].join('')
}

function renderSubreports(
  reports: readonly ReportSubreport[] | null | undefined,
  title: string | undefined,
  description: string | undefined,
): string {
  if (!reports?.length) return ''
  return [
    '<section data-report-appendix="subreports">',
    `<header><h2>${escapeHtml(title || 'Subreports')}</h2><span>${reports.length}</span>${description ? `<p>${escapeHtml(description)}</p>` : ''}</header>`,
    reports.map(renderSubreport).join(''),
    '</section>',
  ].join('')
}

function appendReportData(fragment: string, options: StandaloneReportOptions): string {
  const preview = renderAssetPreview(options.assetPreview)
  const subreports = renderSubreports(
    options.subreports,
    options.subreportsTitle,
    options.subreportsDescription,
  )
  if (!preview && !subreports) return fragment.trim()
  const normalized = fragment.trim()
  const header = /^(<header\b(?=[^>]*data-report-component=["']report-header["'])[^>]*>[\s\S]*?<\/header>)/i.exec(normalized)
  if (!header) return `${preview}${normalized}${subreports}`
  return `${header[1]}${preview}${normalized.slice(header[1].length)}${subreports}`
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
