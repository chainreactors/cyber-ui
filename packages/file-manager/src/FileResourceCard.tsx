import { Children, type ReactNode } from 'react'
import { Download, File } from 'lucide-react'

export interface FileResourceCardProps {
  filename: string
  downloadURL?: string
  downloadLabel?: string
  children?: ReactNode
  className?: string
}

/** A file result/attachment, independent of a file-manager runtime or backend. */
export function FileResourceCard({ filename, downloadURL, downloadLabel = 'Download', children, className = '' }: FileResourceCardProps) {
  const hasPreview = Children.toArray(children).length > 0
  return <figure className={`min-w-0 space-y-2 ${className}`}>
    {children}
    <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span className="inline-flex min-w-0 items-center gap-1.5 break-all">
        {!hasPreview && <File className="h-3.5 w-3.5 shrink-0" />}{filename}
      </span>
      {downloadURL && <a href={downloadURL} download={filename} className="inline-flex shrink-0 items-center gap-1 text-primary hover:underline">
        <Download className="h-3 w-3" />{downloadLabel}
      </a>}
    </figcaption>
  </figure>
}
