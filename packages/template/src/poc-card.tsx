import {
  Badge,
  Card,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cyber/ui"
import { X, FileCode, Tag as TagIcon, User, Plus } from "lucide-react"
import type { CyberHubPocTemplate } from "./types"

const formatDisplayValue = (value: unknown): string => {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (Array.isArray(value)) return value.map(formatDisplayValue).filter(Boolean).join(", ")
  return ""
}

const getSeverityTextColor = (severity?: string) => {
  switch (severity?.toLowerCase()) {
    case "critical": return "text-red-700 border-red-400 bg-red-50"
    case "high": return "text-orange-700 border-orange-400 bg-orange-50"
    case "medium": return "text-amber-700 border-amber-400 bg-amber-50"
    case "low": return "text-blue-700 border-blue-400 bg-blue-50"
    default: return ""
  }
}

const getSeverityLabel = (severity?: string) => {
  switch (severity?.toLowerCase()) {
    case "critical": return "严重"
    case "high": return "高危"
    case "medium": return "中危"
    case "low": return "低危"
    case "info": return "信息"
    default: return severity || "未知"
  }
}

const parseInfoTags = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map((t) => String(t || "").trim()).filter(Boolean)
  if (typeof raw === "string") return raw.split(/[,，、\s]+/).map((t) => t.trim()).filter(Boolean)
  return []
}

export interface POCCardProps {
  poc: CyberHubPocTemplate
  variant?: "default" | "compact"
  showRemove?: boolean
  onRemove?: (poc: CyberHubPocTemplate) => void
  removeLabel?: string
  onClick?: (poc: CyberHubPocTemplate) => void
  onDoubleClick?: (poc: CyberHubPocTemplate) => void
  className?: string
}

export function POCCard({
  poc,
  variant = "default",
  showRemove = false,
  onRemove,
  removeLabel,
  onClick,
  onDoubleClick,
  className = ""
}: POCCardProps) {
  const info = (poc.info ?? {}) as Record<string, unknown>
  const displaySeverity = formatDisplayValue(poc.severity) || formatDisplayValue(info.severity)
  const displayAuthor = formatDisplayValue(poc.author) || formatDisplayValue(info.author)
  const displayTags = (poc.tags && poc.tags.length > 0 ? poc.tags : parseInfoTags(info.tags))
  const cvss = formatDisplayValue(info.cvss)
  const cwe = formatDisplayValue(info.cwe)
  const epss = formatDisplayValue(info.epss)
  const hasCpe = Boolean(info.cpe)
  const source = formatDisplayValue(poc.source)

  const handleCardClick = () => onClick?.(poc)
  const handleCardDoubleClick = () => onDoubleClick?.(poc)
  const handleRemove = (e: React.MouseEvent) => { e.stopPropagation(); onRemove?.(poc) }
  const removeTitle = removeLabel || "移除"

  if (variant === "compact") {
    const tooltipContent = (
      <div className="space-y-2 text-xs max-w-sm">
        <div className="font-semibold text-sm break-all">
          {poc.poc_id ? `${poc.poc_id} - ${poc.name}` : poc.name}
        </div>
        <div className="flex flex-wrap gap-1">
          {displaySeverity && <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getSeverityTextColor(displaySeverity)}`}>{getSeverityLabel(displaySeverity)}</Badge>}
          {poc.cve && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-violet-700 border-violet-400 bg-violet-50">{poc.cve}</Badge>}
          {cvss && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-rose-700 border-rose-400 bg-rose-50">CVSS:{cvss}</Badge>}
          {cwe && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-cyan-700 border-cyan-400 bg-cyan-50">{cwe}</Badge>}
          {epss && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-emerald-700 border-emerald-400 bg-emerald-50">EPSS:{epss}</Badge>}
        </div>
        {displayAuthor && <div className="flex items-center gap-1 pt-1 border-t border-border/50 text-muted-foreground"><User className="h-3 w-3" /><span>{displayAuthor}</span></div>}
        {displayTags.length > 0 && <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50"><TagIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />{displayTags.map((tag, i) => <span key={i} className="text-gray-600">#{tag}</span>)}</div>}
      </div>
    )

    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={`min-w-0 max-w-full overflow-hidden p-2 border rounded-md hover:bg-gray-50 transition-colors ${onClick || onDoubleClick ? "cursor-pointer" : ""} ${className}`} onClick={handleCardClick} onDoubleClick={handleCardDoubleClick}>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 mb-1">
              <div className="flex items-center gap-2 flex-1 basis-full min-w-0">
                <FileCode className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{poc.poc_id ? `${poc.poc_id} - ${poc.name}` : poc.name}</span>
              </div>
              <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1">
                {displaySeverity && <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getSeverityTextColor(displaySeverity)}`}>{getSeverityLabel(displaySeverity)}</Badge>}
                {cvss && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-rose-700 border-rose-400 bg-rose-50">CVSS:{cvss}</Badge>}
                {poc.cve && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-violet-700 border-violet-400 bg-violet-50">{poc.cve}</Badge>}
                {cwe && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-cyan-700 border-cyan-400 bg-cyan-50">{cwe}</Badge>}
                {hasCpe && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-slate-700 border-slate-400 bg-slate-50">CPE</Badge>}
                {epss && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-emerald-700 border-emerald-400 bg-emerald-50">EPSS:{epss}</Badge>}
                {showRemove && onRemove && (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-red-600" onClick={handleRemove} title={removeTitle}>
                    {removeTitle === "添加" ? <Plus className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10px] text-gray-500">
              {displayAuthor && <div className="flex min-w-0 items-center gap-1"><User className="h-3 w-3" /><span className="max-w-[12rem] truncate">{displayAuthor}</span></div>}
              {displayTags.length > 0 && <div className="flex items-center gap-1 flex-wrap min-w-0"><TagIcon className="h-3 w-3" />{displayTags.slice(0, 3).map((tag, i) => <span key={i} className="max-w-full break-all text-[10px]">#{tag}</span>)}{displayTags.length > 3 && <span className="text-[10px] text-gray-400">+{displayTags.length - 3}</span>}</div>}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="p-3 max-w-md z-[9999]">{tooltipContent}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Card className={`p-3 hover:shadow-md transition-all ${onClick || onDoubleClick ? "cursor-pointer" : ""} ${className}`} onClick={handleCardClick} onDoubleClick={handleCardDoubleClick}>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <FileCode className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {poc.id && <span className="text-[9px] text-gray-400 font-mono flex-shrink-0">#{String(poc.id)}</span>}
                <h4 className="font-semibold text-sm truncate" title={poc.poc_id ? `${poc.poc_id} - ${poc.name}` : poc.name}>{poc.poc_id ? `${poc.poc_id} - ${poc.name}` : poc.name}</h4>
                {source && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-blue-700 border-blue-400 bg-blue-50">{source}</Badge>}
                {displaySeverity && <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getSeverityTextColor(displaySeverity)}`}>{getSeverityLabel(displaySeverity)}</Badge>}
                {poc.cve && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-violet-700 border-violet-400 bg-violet-50">{poc.cve}</Badge>}
                {cvss && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-rose-700 border-rose-400 bg-rose-50">CVSS:{cvss}</Badge>}
              </div>
            </div>
          </div>
          {showRemove && onRemove && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-600" onClick={handleRemove} title={removeTitle}>
              {removeTitle === "添加" ? <Plus className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-500 pt-1 border-t">
          {displayAuthor && <div className="flex items-center gap-1"><User className="h-3 w-3" /><span>{displayAuthor}</span></div>}
          {poc.type && <div className="flex items-center gap-1"><FileCode className="h-3 w-3" /><span>{poc.type}</span></div>}
          {displayTags.length > 0 && <div className="flex items-center gap-1 flex-wrap"><TagIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />{displayTags.map((tag, i) => <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">#{tag}</Badge>)}</div>}
        </div>
      </div>
    </Card>
  )
}
