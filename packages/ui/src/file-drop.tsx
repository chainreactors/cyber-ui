import * as React from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@cyber/theme'
import { Badge } from './badge'
import { Button } from './button'

export interface FileDropProps {
  title: string
  description?: string
  formats?: string[]
  accept?: string
  multiple?: boolean
  disabled?: boolean
  loading?: boolean
  className?: string
  loadingText?: string
  browseText?: string
  hintText?: string
  onFileSelect?: (file: File) => void | Promise<void>
  onFilesSelect?: (files: File[]) => void | Promise<void>
}

export function FileDrop({
  title,
  description,
  formats = [],
  accept,
  multiple = false,
  disabled = false,
  loading = false,
  className,
  loadingText = 'Importing…',
  browseText = 'Browse',
  hintText,
  onFileSelect,
  onFilesSelect,
}: FileDropProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const handleFiles = React.useCallback(
    (files: FileList | null) => {
      const selected = Array.from(files ?? [])
      if (selected.length === 0 || disabled || loading) return
      if (multiple && onFilesSelect) {
        void onFilesSelect(selected)
      } else {
        void onFileSelect?.(selected[0])
      }
    },
    [disabled, loading, multiple, onFileSelect, onFilesSelect],
  )

  const open = React.useCallback(() => {
    if (!disabled && !loading) inputRef.current?.click()
  }, [disabled, loading])

  return (
    <div className={cn('rounded-lg border border-border bg-card shadow-sm', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span>{title}</span>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>

        {formats.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {formats.map((f) => (
              <Badge key={f} variant="secondary" size="sm">
                {f}
              </Badge>
            ))}
          </div>
        )}

        <div
          role="button"
          tabIndex={disabled || loading ? -1 : 0}
          aria-disabled={disabled || loading}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              open()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled && !loading) setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            if (!disabled && !loading) handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-colors',
            disabled || loading
              ? 'cursor-not-allowed border-border/60 bg-muted/50 text-muted-foreground'
              : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
            isDragging && !disabled && !loading && 'border-primary bg-primary/10 text-primary',
          )}
        >
          <Upload
            className={cn('mb-2 h-6 w-6', disabled || loading ? 'text-muted-foreground/40' : 'text-current')}
          />
          <div className="text-sm font-medium">
            {loading ? loadingText : title}
          </div>
          {hintText && (
            <div className="mt-1 text-xs text-muted-foreground">{hintText}</div>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || loading}
            className="mt-3"
            onClick={(e) => {
              e.stopPropagation()
              open()
            }}
          >
            {browseText}
          </Button>
        </div>
      </div>
    </div>
  )
}

