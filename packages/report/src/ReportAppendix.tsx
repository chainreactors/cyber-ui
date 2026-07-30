import { CSTXTable, type CstxReportPreview, type CstxReportPreviewSheet } from '@cyber/cstx'
import { Badge } from '@cyber/ui'
import type { ReportSubreport } from './appendix'

const SEVERITY_VARIANT = {
  critical: 'destructive',
  high: 'caution',
  medium: 'warning',
  low: 'info',
  info: 'secondary',
} as const

function PreviewSheet({ sheet }: { sheet: CstxReportPreviewSheet }) {
  const rows = Array.isArray(sheet.rows) ? sheet.rows : []
  const columns = Array.isArray(sheet.columns) ? sheet.columns : []
  return (
    <div className="space-y-2">
      <CSTXTable
        data={{ rows, total: sheet.total }}
        loading={{ rows: false }}
        errors={{ rows: null }}
        colSpan={Math.max(columns.length, 1)}
        config={{
          title: sheet.title,
          columns,
          enableSearch: false,
          enablePagination: false,
          enableSorting: false,
          enableFieldSearch: false,
          enableRowSelection: false,
          enableColoredTypes: true,
          compact: true,
          layout: 'auto',
          rowIdKey: 'cstx_id',
          showRowCount: true,
          emptyText: 'No assets',
        }}
      />
      {sheet.preview_limit && sheet.total > rows.length && (
        <div className="rounded-md border border-primary/10 bg-primary/[0.035] px-3 py-2 text-[11px] text-muted-foreground">
          Preview limited to {sheet.preview_limit} rows.
        </div>
      )}
    </div>
  )
}

export function CSTXPreview({ preview }: { preview?: CstxReportPreview | null }) {
  if (!preview?.sheets?.length) return null
  const total = preview.sheets.reduce((sum, sheet) => sum + Math.max(0, Number(sheet.total) || 0), 0)
  return (
    <section
      data-report-appendix="asset-preview"
      className="my-5 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-card shadow-sm"
    >
      <header className="flex flex-wrap items-start gap-3 border-b border-primary/15 px-4 py-3.5">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="info" size="sm">CSTX</Badge>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary">Asset preview</span>
          </div>
          <h2 className="m-0 border-0 p-0 text-base font-semibold text-foreground">{preview.title}</h2>
          {preview.query && <p className="mt-1 font-mono text-[11px] text-muted-foreground">{preview.query}</p>}
        </div>
        <div className="ml-auto rounded-lg border border-primary/15 bg-background/75 px-3 py-1.5 text-right">
          <div className="text-lg font-semibold tabular-nums text-primary">{total}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">assets</div>
        </div>
      </header>
      <div className="space-y-3 p-3.5">
        {preview.sheets.map((sheet) => <PreviewSheet key={sheet.id} sheet={sheet} />)}
      </div>
    </section>
  )
}

function Subreport({ report }: { report: ReportSubreport }) {
  const severity = (report.severity || 'info').toLowerCase()
  const variant = SEVERITY_VARIANT[severity as keyof typeof SEVERITY_VARIANT] ?? 'secondary'
  return (
    <details
      data-report-appendix="subreport"
      data-report-severity={severity}
      className="group overflow-hidden rounded-xl border border-border bg-card open:border-primary/25 open:shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden hover:bg-primary/[0.035]">
        <span className="text-xs text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true">›</span>
        <Badge variant={variant} size="sm">{severity}</Badge>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{report.title}</span>
      </summary>
      <div className="border-t border-border px-4 py-4">
        {report.summary && <p className="mb-3 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">{report.summary}</p>}
        {!!report.fields?.length && (
          <dl className="grid gap-x-5 gap-y-2 rounded-lg border border-primary/10 bg-primary/[0.025] px-3 py-2.5 text-xs sm:grid-cols-2">
            {report.fields.map((field) => (
              <div key={`${field.label}-${field.value}`} className="min-w-0">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{field.label}</dt>
                <dd className="mt-0.5 break-words text-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {!!report.evidence?.length && (
          <div className="mt-3 space-y-3">
            {report.evidence.map((evidence) => (
              <section key={evidence.label}>
                <h4 className="mb-1 text-xs font-semibold text-foreground">{evidence.label}</h4>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-primary/10 bg-primary/[0.025] px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                  {evidence.content}
                </pre>
              </section>
            ))}
          </div>
        )}
        {report.href && (
          <a className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline" href={report.href}>
            {report.hrefLabel || 'Open subreport'}
          </a>
        )}
      </div>
    </details>
  )
}

export function ReportSubreports({
  reports,
  title = 'Subreports',
  description,
}: {
  reports?: readonly ReportSubreport[] | null
  title?: string
  description?: string
}) {
  if (!reports?.length) return null
  return (
    <section data-report-appendix="subreports" className="my-6">
      <header className="mb-3 border-b border-primary/20 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="m-0 border-0 p-0 text-base font-semibold text-primary">{title}</h2>
          <span className="text-xs tabular-nums text-muted-foreground">{reports.length}</span>
        </div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="space-y-2.5">
        {reports.map((report) => <Subreport key={report.id} report={report} />)}
      </div>
    </section>
  )
}
