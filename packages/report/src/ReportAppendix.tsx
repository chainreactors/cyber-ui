import type { ReactNode } from 'react'
import { CSTXTable, type CstxReportPreview, type CstxReportPreviewSheet } from '@cyber/cstx'
import type { TrafficHttpView } from '@cyber/traffic'
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@cyber/ui'
import { VulnerabilityExplorer } from './VulnerabilityExplorer'
import type { ReportVulnerabilityRecord } from './vulnerability'

const COPY = {
  zh: {
    kicker: '任务产物',
    assets: '资产',
    findings: '漏洞',
    noAssets: '暂无资产',
    previewLimited: (limit: number) => `当前预览前 ${limit} 条。`,
  },
  en: {
    kicker: 'Task results',
    assets: 'assets',
    findings: 'findings',
    noAssets: 'No assets',
    previewLimited: (limit: number) => `Preview limited to ${limit} rows.`,
  },
} as const

function PreviewSheet({ sheet, lang }: { sheet: CstxReportPreviewSheet; lang: 'zh' | 'en' }) {
  const rows = Array.isArray(sheet.rows) ? sheet.rows : []
  const columns = Array.isArray(sheet.columns) ? sheet.columns : []
  const text = COPY[lang]
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
          enableSearch: true,
          enablePagination: rows.length > 25,
          pageSize: 25,
          pageSizeOptions: [25, 50, 100],
          enableSorting: true,
          enableFieldSearch: true,
          enableRowSelection: false,
          enableColumnResize: columns.length > 3,
          columnSelector: columns.length > 5,
          enableColoredTypes: true,
          enableExport: true,
          exportFormats: ['csv'],
          compact: true,
          layout: 'auto',
          typeFilterKey: 'type',
          rowIdKey: 'cstx_id',
          showRowCount: true,
          emptyText: text.noAssets,
        }}
      />
      {sheet.preview_limit && sheet.total > rows.length && (
        <div className="rounded-md border border-primary/10 bg-primary/[0.035] px-3 py-2 text-[11px] text-muted-foreground">
          {text.previewLimited(sheet.preview_limit)}
        </div>
      )}
    </div>
  )
}

/**
 * One task-owned result browser. Assets stay in the mature interactive
 * CSTXTable; vulnerability records are read directly from their CSTX payload
 * and browsed as report, traffic, and template views.
 */
export function ReportTaskPreview({
  preview,
  vulnerabilities,
  vulnerabilitiesTitle = 'Vulnerabilities',
  vulnerabilitiesDescription,
  lang = 'en',
  renderHttpView,
}: {
  preview?: CstxReportPreview | null
  vulnerabilities?: readonly ReportVulnerabilityRecord[] | null
  vulnerabilitiesTitle?: string
  vulnerabilitiesDescription?: string
  lang?: 'zh' | 'en'
  renderHttpView?: (view: TrafficHttpView) => ReactNode
}) {
  const sheets = preview?.sheets?.length ? preview.sheets : []
  const records = vulnerabilities?.length ? vulnerabilities : []
  if (!sheets.length && !records.length) return null

  const assetTotal = sheets.reduce((sum, sheet) => sum + Math.max(0, Number(sheet.total) || 0), 0)
  const hasAssets = sheets.length > 0
  const hasVulnerabilities = records.length > 0
  const text = COPY[lang]
  const title = preview?.title || vulnerabilitiesTitle
  const assetTabTitle = sheets.length === 1 ? sheets[0].title : (lang === 'zh' ? 'CSTX 资产' : 'CSTX assets')

  const assetsPanel = (
    <div data-report-preview="assets" className="space-y-3">
      {sheets.map((sheet) => <PreviewSheet key={sheet.id} sheet={sheet} lang={lang} />)}
    </div>
  )
  const vulnerabilitiesPanel = (
    <div data-report-preview="vulnerabilities">
      {vulnerabilitiesDescription && <p className="mb-3 text-xs text-muted-foreground">{vulnerabilitiesDescription}</p>}
      <VulnerabilityExplorer records={records} lang={lang} renderHttpView={renderHttpView} />
    </div>
  )

  return (
    <section
      data-report-appendix="task-preview"
      className="my-5 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-card shadow-sm"
    >
      <header className="flex flex-wrap items-start gap-3 border-b border-primary/15 px-4 py-3.5">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="info" size="sm">CSTX</Badge>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary">{text.kicker}</span>
          </div>
          <h2 className="m-0 border-0 p-0 text-base font-semibold text-primary">{title}</h2>
          {preview?.query && <p className="mt-1 font-mono text-[11px] text-muted-foreground">{preview.query}</p>}
        </div>
        <div className="ml-auto flex gap-2">
          {hasAssets && (
            <div className="rounded-lg border border-primary/15 bg-background/75 px-3 py-1.5 text-right">
              <div className="text-lg font-semibold tabular-nums text-primary">{assetTotal}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{text.assets}</div>
            </div>
          )}
          {hasVulnerabilities && (
            <div className="rounded-lg border border-primary/15 bg-background/75 px-3 py-1.5 text-right">
              <div className="text-lg font-semibold tabular-nums text-primary">{records.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{text.findings}</div>
            </div>
          )}
        </div>
      </header>
      <div className="p-3.5">
        {hasAssets && hasVulnerabilities ? (
          <Tabs defaultValue="assets">
            <TabsList className="h-auto w-full justify-start gap-1 rounded-lg border border-primary/10 bg-primary/[0.035] p-1">
              <TabsTrigger value="assets" className="gap-2 px-3 py-1.5 text-xs data-[state=active]:text-primary">
                {assetTabTitle}
                <span className="text-[10px] tabular-nums text-muted-foreground">{assetTotal}</span>
              </TabsTrigger>
              <TabsTrigger value="vulnerabilities" className="gap-2 px-3 py-1.5 text-xs data-[state=active]:text-primary">
                {vulnerabilitiesTitle}
                <span className="text-[10px] tabular-nums text-muted-foreground">{records.length}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="assets" forceMount className="mt-3 data-[state=inactive]:hidden">{assetsPanel}</TabsContent>
            <TabsContent value="vulnerabilities" forceMount className="mt-3 data-[state=inactive]:hidden">{vulnerabilitiesPanel}</TabsContent>
          </Tabs>
        ) : hasAssets ? assetsPanel : vulnerabilitiesPanel}
      </div>
    </section>
  )
}
