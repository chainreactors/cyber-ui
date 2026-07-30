export interface StandaloneReportOptions {
  title?: string
  lang?: string
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
  --report-card: #f0f2f5;
  --report-border: rgba(12, 15, 20, 0.12);
  --report-border-subtle: rgba(12, 15, 20, 0.06);
  --report-text: #111827;
  --report-muted: #4b5563;
  --report-dim: #7b8492;
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
.cyber-report h1 { margin: 4px 0 12px; font-size: 28px; letter-spacing: -0.02em; }
.cyber-report h2 { margin: 28px 0 10px; padding-bottom: 7px; border-bottom: 1px solid var(--report-border); font-size: 19px; }
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
  background: #f7f8fa;
  color: #303846;
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
.cyber-report tbody tr:nth-child(even) { background: rgba(240, 242, 245, 0.45); }

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

.cyber-report [data-report-component="report-header"] { margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid var(--report-border); }
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
.cyber-report [data-report-component="http-evidence"] { margin: 14px 0; padding: 12px 14px; border: 1px solid var(--report-border); border-radius: 10px; background: #fbfcfd; }
.cyber-report [data-report-component="http-evidence"] > h4:first-child { margin-top: 0; }
.cyber-report [data-report-component="data-table"] { display: table; }
.cyber-report [data-report-component="toc"] { margin: 14px 0; padding: 12px 16px; border: 1px solid var(--report-border); border-radius: 9px; background: var(--report-card); }
.cyber-report [data-report-component="callout"][data-report-tone="warn"] { border-left-color: var(--report-yellow); background: rgba(148, 118, 20, 0.08); }
.cyber-report [data-report-component="callout"][data-report-tone="danger"] { border-left-color: var(--report-red); background: rgba(197, 53, 84, 0.08); }
.cyber-report [data-report-component="callout"][data-report-tone="info"],
.cyber-report [data-report-component="callout"][data-report-tone="note"] { border-left-color: var(--report-accent); background: var(--report-accent-soft); }

@media (max-width: 680px) {
  body { padding: 0; }
  .cyber-report { padding: 26px 20px 34px; border: 0; border-radius: 0; box-shadow: none; }
  .cyber-report h1 { font-size: 23px; }
  .cyber-report table { display: block; overflow-x: auto; }
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
  .cyber-report [data-report-component="http-evidence"] { break-inside: avoid; }
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
    fragment.trim(),
    '</main>',
    '</body>',
    '</html>',
    '',
  ].join('\n')
}
