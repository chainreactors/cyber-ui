export interface ReportSubreportField {
  label: string
  value: string
}

export interface ReportSubreportEvidence {
  label: string
  content: string
}

export interface ReportSubreport {
  id: string
  title: string
  severity?: string
  summary?: string
  fields?: ReportSubreportField[]
  evidence?: ReportSubreportEvidence[]
  href?: string
  hrefLabel?: string
}
