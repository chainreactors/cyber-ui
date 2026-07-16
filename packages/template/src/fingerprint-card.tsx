import {
  Badge, Card, Button, Tooltip, TooltipContent, TooltipTrigger,
} from "@cyber/ui"
import {
  X, Plus, Fingerprint as FingerprintIcon, Tag as TagIcon, User,
  Star, TrendingUp, Building2, Box, FolderTree, Layers, FileBarChart,
} from "lucide-react"
import type { CyberHubFingerprintTemplate } from "./types"

const getStatusLabel = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "active": return "活跃"
    case "pending": return "待审"
    case "draft": return "草稿"
    case "inactive": return "停用"
    case "deprecated": return "废弃"
    default: return status || "未知"
  }
}

export interface FingerprintCardProps {
  fingerprint: CyberHubFingerprintTemplate
  variant?: 'default' | 'compact'
  showRemove?: boolean
  onRemove?: (fingerprint: CyberHubFingerprintTemplate) => void
  removeLabel?: string
  onClick?: (fingerprint: CyberHubFingerprintTemplate) => void
  onFieldClick?: (field: string, value: string) => void
  className?: string
}

export function FingerprintCard({
  fingerprint, variant = 'default', showRemove = false,
  onRemove, removeLabel, onClick, onFieldClick, className = ""
}: FingerprintCardProps) {
  const handleCardClick = () => onClick?.(fingerprint)
  const handleRemove = (e: React.MouseEvent) => { e.stopPropagation(); onRemove?.(fingerprint) }
  const handleFieldClick = (e: React.MouseEvent, field: string, value: string) => { e.stopPropagation(); onFieldClick?.(field, value) }
  const removeTitle = removeLabel || "移除"

  const alias = fingerprint.alias
  const hasAlias = alias?.vendor || alias?.product || alias?.category || alias?.type || alias?.sic

  if (variant === 'compact') {
    const tooltipContent = (
      <div className="space-y-2 text-xs max-w-sm">
        <div className="font-semibold text-sm break-all">{fingerprint.name}</div>
        <div className="flex flex-wrap gap-1">
          {fingerprint.id && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">#{String(fingerprint.id)}</Badge>}
          {fingerprint.protocol && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-sky-700 border-sky-400 bg-sky-50">{fingerprint.protocol.toUpperCase()}</Badge>}
          {fingerprint.source && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-fuchsia-700 border-fuchsia-400 bg-fuchsia-50">{fingerprint.source}</Badge>}
          {fingerprint.status && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-400 bg-emerald-50">{getStatusLabel(fingerprint.status)}</Badge>}
        </div>
        {hasAlias && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
            {alias?.vendor && <span className="flex items-center gap-1 text-sky-700"><Building2 className="h-3 w-3" />{alias.vendor}</span>}
            {alias?.product && <span className="flex items-center gap-1 text-indigo-700"><Box className="h-3 w-3" />{alias.product}</span>}
            {alias?.category && <span className="flex items-center gap-1 text-teal-700"><FolderTree className="h-3 w-3" />{alias.category}</span>}
            {alias?.type && <span className="flex items-center gap-1 text-amber-700"><Layers className="h-3 w-3" />{alias.type}</span>}
            {alias?.sic && <span className="flex items-center gap-1 text-pink-700"><FileBarChart className="h-3 w-3" />{alias.sic}</span>}
          </div>
        )}
        {fingerprint.tags && fingerprint.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
            <TagIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            {fingerprint.tags.map((tag, i) => <span key={i} className="text-gray-600">#{tag}</span>)}
          </div>
        )}
        {fingerprint.description && <div className="pt-1 border-t border-border/50 text-muted-foreground break-all">{fingerprint.description}</div>}
      </div>
    )

    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={`min-w-0 max-w-full overflow-hidden p-2 border rounded-md transition-colors hover:bg-accent/30 ${onClick ? "cursor-pointer" : ""} ${className}`} onClick={handleCardClick}>
            <div className="flex min-w-0 items-center gap-1 mb-1">
              <FingerprintIcon className="h-4 w-4 text-primary flex-shrink-0" />
              {fingerprint.id && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-slate-600 border-slate-400 bg-slate-50">#{String(fingerprint.id)}</Badge>}
              <div className="flex items-center gap-1 flex-1 min-w-0">
                {fingerprint.is_focus && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                <span className="text-sm font-semibold truncate">{fingerprint.name}</span>
              </div>
              {fingerprint.protocol && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-sky-700 border-sky-400 bg-sky-50">{fingerprint.protocol.toUpperCase()}</Badge>}
              {fingerprint.source && <Badge variant="outline" className="max-w-[9rem] truncate text-[10px] px-1.5 py-0 text-fuchsia-700 border-fuchsia-400 bg-fuchsia-50">{fingerprint.source}</Badge>}
              {fingerprint.status && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-400 bg-emerald-50">{getStatusLabel(fingerprint.status)}</Badge>}
              {showRemove && onRemove && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 flex-shrink-0" onClick={handleRemove} title={removeTitle}>
                  {removeTitle === "添加" ? <Plus className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
            {hasAlias && (
              <div className="flex min-w-0 items-center gap-1 flex-wrap mb-1 text-[10px] text-muted-foreground">
                {alias?.vendor && <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer text-sky-700 border-sky-400 bg-sky-50 hover:bg-sky-100" onClick={(e) => handleFieldClick(e, 'vendor', alias.vendor!)}><Building2 className="h-2.5 w-2.5 mr-1" /><span className="max-w-[10rem] truncate">{alias.vendor}</span></Badge>}
                {alias?.product && <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer text-indigo-700 border-indigo-400 bg-indigo-50 hover:bg-indigo-100" onClick={(e) => handleFieldClick(e, 'product', alias.product!)}><Box className="h-2.5 w-2.5 mr-1" /><span className="max-w-[10rem] truncate">{alias.product}</span></Badge>}
                {alias?.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer text-teal-700 border-teal-400 bg-teal-50 hover:bg-teal-100" onClick={(e) => handleFieldClick(e, 'category', alias.category!)}><FolderTree className="h-2.5 w-2.5 mr-1" />{alias.category}</Badge>}
                {alias?.type && <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer text-amber-700 border-amber-400 bg-amber-50 hover:bg-amber-100" onClick={(e) => handleFieldClick(e, 'type', alias.type!)}><Layers className="h-2.5 w-2.5 mr-1" />{alias.type}</Badge>}
                {alias?.sic && <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer text-pink-700 border-pink-400 bg-pink-50 hover:bg-pink-100" onClick={(e) => handleFieldClick(e, 'sic', alias.sic!)}><FileBarChart className="h-2.5 w-2.5 mr-1" />{alias.sic}</Badge>}
                {fingerprint.match_count !== undefined && fingerprint.match_count > 0 && <span className="flex items-center gap-0.5 text-green-600"><TrendingUp className="h-2.5 w-2.5" />{fingerprint.match_count}</span>}
                {fingerprint.author && <span className="flex items-center gap-0.5 ml-auto text-muted-foreground"><User className="h-2.5 w-2.5" />{fingerprint.author}</span>}
              </div>
            )}
            {fingerprint.tags && fingerprint.tags.length > 0 && (
              <div className="flex min-w-0 items-start gap-1 border-t border-border/50 pt-1">
                <TagIcon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex min-w-0 items-center gap-1 flex-wrap text-[10px] text-muted-foreground">
                  {fingerprint.tags.map((tag, i) => <Badge key={i} variant="outline" className="text-[10px] px-1 py-0 cursor-pointer text-gray-700 border-gray-400 bg-gray-50 hover:bg-gray-100" onClick={(e) => handleFieldClick(e, 'tag', tag)}>#{tag}</Badge>)}
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="p-3 max-w-md z-[9999]">{tooltipContent}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Card className={`p-3 shadow-none transition-colors hover:bg-accent/30 ${onClick ? "cursor-pointer" : ""} ${className}`} onClick={handleCardClick}>
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <FingerprintIcon className="h-5 w-5 text-primary flex-shrink-0" />
          {fingerprint.id && <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-mono text-slate-600 border-slate-400 bg-slate-50">#{String(fingerprint.id)}</Badge>}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {fingerprint.is_focus && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
            <h4 className="font-semibold text-base truncate" title={fingerprint.name}>{fingerprint.name}</h4>
          </div>
          {fingerprint.protocol && <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-mono text-sky-700 border-sky-400 bg-sky-50">{fingerprint.protocol.toUpperCase()}</Badge>}
          {fingerprint.source && <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-fuchsia-700 border-fuchsia-400 bg-fuchsia-50">{fingerprint.source}</Badge>}
          {fingerprint.status && <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-emerald-700 border-emerald-400 bg-emerald-50">{getStatusLabel(fingerprint.status)}</Badge>}
          {showRemove && onRemove && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 flex-shrink-0" onClick={handleRemove} title={removeTitle}>
              {removeTitle === "添加" ? <Plus className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4" />}
            </Button>
          )}
        </div>
        {hasAlias && (
          <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
            {alias?.vendor && <Badge variant="outline" className="text-[11px] px-2 py-0.5 cursor-pointer text-sky-700 border-sky-400 bg-sky-50 hover:bg-sky-100" onClick={(e) => handleFieldClick(e, 'vendor', alias.vendor!)}><Building2 className="h-3 w-3 mr-1" />{alias.vendor}</Badge>}
            {alias?.product && <Badge variant="outline" className="text-[11px] px-2 py-0.5 cursor-pointer text-indigo-700 border-indigo-400 bg-indigo-50 hover:bg-indigo-100" onClick={(e) => handleFieldClick(e, 'product', alias.product!)}><Box className="h-3 w-3 mr-1" />{alias.product}</Badge>}
            {alias?.category && <Badge variant="outline" className="text-[11px] px-2 py-0.5 cursor-pointer text-teal-700 border-teal-400 bg-teal-50 hover:bg-teal-100" onClick={(e) => handleFieldClick(e, 'category', alias.category!)}><FolderTree className="h-3 w-3 mr-1" />{alias.category}</Badge>}
            {alias?.type && <Badge variant="outline" className="text-[11px] px-2 py-0.5 cursor-pointer text-amber-700 border-amber-400 bg-amber-50 hover:bg-amber-100" onClick={(e) => handleFieldClick(e, 'type', alias.type!)}><Layers className="h-3 w-3 mr-1" />{alias.type}</Badge>}
            {alias?.sic && <Badge variant="outline" className="text-[11px] px-2 py-0.5 cursor-pointer text-pink-700 border-pink-400 bg-pink-50 hover:bg-pink-100" onClick={(e) => handleFieldClick(e, 'sic', alias.sic!)}><FileBarChart className="h-3 w-3 mr-1" />{alias.sic}</Badge>}
            {fingerprint.match_count !== undefined && fingerprint.match_count > 0 && <span className="flex items-center gap-1 text-green-600"><TrendingUp className="h-3 w-3" /><span className="font-mono">{fingerprint.match_count}</span></span>}
            {fingerprint.author && <span className="flex items-center gap-1 ml-auto"><User className="h-3 w-3" />{fingerprint.author}</span>}
          </div>
        )}
        {fingerprint.description && <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed" title={fingerprint.description}>{fingerprint.description}</p>}
        {fingerprint.tags && fingerprint.tags.length > 0 && (
          <div className="flex items-start gap-1 border-t border-border/50 pt-1">
            <TagIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex items-center gap-1 flex-wrap text-[11px] text-muted-foreground">
              {fingerprint.tags.map((tag, i) => <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer text-gray-700 border-gray-400 bg-gray-50 hover:bg-gray-100" onClick={(e) => handleFieldClick(e, 'tag', tag)}>#{tag}</Badge>)}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
