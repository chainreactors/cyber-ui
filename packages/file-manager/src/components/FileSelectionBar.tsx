"use client"

import { useTranslations } from "../runtime"
import { Button, Separator } from "../ui"
import { Download, Trash2, X } from "../icons"

interface FileSelectionBarProps {
  selectedCount: number
  onDownload?: () => void
  onDelete?: () => void
  onClear: () => void
}

export function FileSelectionBar({
  selectedCount,
  onDownload,
  onDelete,
  onClear,
}: FileSelectionBarProps) {
  const t = useTranslations('Sessions.fileManagement')

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {t('selectedCount', { count: selectedCount })}
      </span>

      <Separator orientation="vertical" className="h-4" />

      {onDownload && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onDownload}>
        <Download className="w-3.5 h-3.5 mr-1.5" />
        {t('download')}
      </Button>}
      {onDelete && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
        {t('delete')}
      </Button>}

      <Separator orientation="vertical" className="h-4" />

      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={onClear}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}
