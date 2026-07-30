"use client"

import React from 'react'
import { createPortal } from 'react-dom'

import { CheckCircle2, Loader2, X, XCircle } from '../icons'
import { useFileManagerTranslations } from '../runtime'
import type { UploadProgress } from '../types'
import { Button, Progress } from '../ui'

interface UploadProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  progresses: Map<string, UploadProgress>
  currentIndex: number
  totalFiles: number
  onCancel?: () => void
}

function statusLabel(
  t: ReturnType<typeof useFileManagerTranslations>,
  status: UploadProgress['status'],
): string {
  switch (status) {
    case 'uploading':
      return t('uploadPhaseUploading')
    case 'staged':
      return t('uploadPhaseStaged')
    case 'delivering':
      return t('uploadPhaseDelivering')
    case 'completed':
      return t('uploadPhaseCompleted')
    case 'error':
      return t('uploadPhaseFailed')
    case 'canceled':
      return t('uploadPhaseCanceled')
    default:
      return t('uploadPhasePending')
  }
}

export function UploadProgressDialog({
  open,
  onOpenChange,
  progresses,
  totalFiles,
  onCancel,
}: UploadProgressDialogProps) {
  const t = useFileManagerTranslations()

  const progressArray = Array.from(progresses.values())
  const terminalCount = progressArray.filter((progress) =>
    progress.status === 'completed' ||
    progress.status === 'error' ||
    progress.status === 'canceled',
  ).length
  const completedCount = progressArray.filter((progress) => progress.status === 'completed').length
  const errorCount = progressArray.filter((progress) =>
    progress.status === 'error' || progress.status === 'canceled',
  ).length
  const isComplete = totalFiles > 0 && terminalCount === totalFiles
  const showPerFileProgress = totalFiles > 1
  const totalBytes = progressArray.reduce(
    (sum, progress) => sum + Math.max(progress.totalSize ?? 0, 0),
    0,
  )
  const uploadedBytes = progressArray.reduce(
    (sum, progress) =>
      sum +
      Math.max(progress.totalSize ?? 0, 0) *
        (Math.min(100, Math.max(0, progress.progress)) / 100),
    0,
  )
  const overallProgress = totalBytes > 0
    ? (uploadedBytes / totalBytes) * 100
    : isComplete
      ? 100
      : 0

  React.useEffect(() => {
    if (!open || !isComplete) return

    const timer = window.setTimeout(() => onOpenChange(false), 3000)
    return () => window.clearTimeout(timer)
  }, [isComplete, onOpenChange, open])

  if (!open || totalFiles === 0 || typeof document === 'undefined') return null

  return createPortal(
    <aside
      aria-label={t('uploadProgress')}
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[70] w-[calc(100vw-2rem)] max-w-md rounded-lg border border-border bg-card p-4 shadow-xl"
      role="status"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-normal">{t('uploadProgress')}</h2>
          <Button
            aria-label={t('hideUploadProgress')}
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('uploadingFiles', {
                current: terminalCount,
                total: totalFiles,
              })}
            </span>
            <span className="font-normal">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        <div
          className="max-h-[400px] divide-y divide-border overflow-y-auto"
          role="list"
        >
          {progressArray.map((progress) => {
            const inFlight =
              progress.status === 'uploading' ||
              progress.status === 'staged' ||
              progress.status === 'delivering'

            return (
              <div
                key={progress.id}
                className="flex min-h-14 items-center gap-3 py-3"
                role="listitem"
              >
                <div className="shrink-0">
                  {progress.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--status-success-fg)]" />
                  ) : null}
                  {progress.status === 'error' || progress.status === 'canceled' ? (
                    <XCircle className="h-5 w-5 text-[var(--status-danger-fg)]" />
                  ) : null}
                  {inFlight ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : null}
                  {progress.status === 'pending' ? (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-normal" title={progress.fileName}>
                    {progress.fileName}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {statusLabel(t, progress.status)}
                  </div>
                  {progress.status === 'error' && progress.error ? (
                    <div className="mt-1 text-xs text-[var(--status-danger-fg)]">
                      {progress.error}
                    </div>
                  ) : null}
                  {inFlight && showPerFileProgress ? (
                    <Progress value={progress.progress} className="mt-1 h-1" />
                  ) : null}
                </div>

                {inFlight && showPerFileProgress ? (
                  <div className="shrink-0 text-sm text-muted-foreground">
                    {Math.round(progress.progress)}%
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        {!isComplete && onCancel ? (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              {t('cancelUpload')}
            </Button>
          </div>
        ) : null}

        {isComplete ? (
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-sm text-muted-foreground">
              {t('uploadSummary', { completed: completedCount, failed: errorCount })}
            </span>
          </div>
        ) : null}
      </div>
    </aside>,
    document.body,
  )
}
