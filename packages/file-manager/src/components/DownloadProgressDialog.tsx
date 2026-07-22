"use client"

import React from 'react'
import { useTranslations } from '../runtime'
import { FormDialog } from '../ui'
import { Progress } from '../ui'
import { CheckCircle2, XCircle, Loader2, X } from '../icons'
import { Button } from '../ui'
import type { DownloadProgress } from '../types'

interface DownloadProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  progresses: Map<string, DownloadProgress>
  totalFiles: number
  onCancel?: () => void
}

export function DownloadProgressDialog({
  open,
  onOpenChange,
  progresses,
  totalFiles,
  onCancel,
}: DownloadProgressDialogProps) {
  const t = useTranslations('Sessions.fileManagement')

  const progressArray = Array.from(progresses.values())
  const completedCount = progressArray.filter((p) => p.status === 'completed').length
  const errorCount = progressArray.filter((p) => p.status === 'error').length
  const isComplete = completedCount + errorCount === totalFiles && totalFiles > 0
  const overallProgress = totalFiles > 0 ? ((completedCount + errorCount) / totalFiles) * 100 : 0

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('downloadProgress')}
      hideFooter={!isComplete}
      maxWidth="lg"
      onSubmit={() => onOpenChange(false)}
      submitText={t('common.cancel')}
    >
      <div className="space-y-4">
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('downloadingFiles', {
                current: completedCount + errorCount,
                total: totalFiles,
              })}
            </span>
            <span className="font-normal">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Individual file progress */}
        <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-3">
          {progressArray.map((progress) => (
            <div
              key={progress.fileName}
              className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/30"
            >
              <div className="flex-shrink-0">
                {progress.status === 'completed' && (
                  <CheckCircle2 className="w-5 h-5 text-[var(--status-success-fg)]" />
                )}
                {progress.status === 'error' && (
                  <XCircle className="w-5 h-5 text-[var(--status-danger-fg)]" />
                )}
                {progress.status === 'downloading' && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
                {progress.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-normal truncate" title={progress.fileName}>
                  {progress.fileName}
                </div>
                {progress.status === 'error' && progress.error && (
                  <div className="text-xs text-[var(--status-danger-fg)] mt-1">{progress.error}</div>
                )}
                {progress.status === 'downloading' && (
                  <Progress value={progress.progress} className="h-1 mt-1" />
                )}
              </div>

              {progress.status === 'downloading' && (
                <div className="text-sm text-muted-foreground flex-shrink-0">
                  {Math.round(progress.progress)}%
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Cancel button */}
        {!isComplete && onCancel && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              {t('cancelDownload')}
            </Button>
          </div>
        )}

        {/* Summary */}
        {isComplete && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              {t('downloadComplete')}
            </span>
            <div className="flex items-center gap-4 text-sm">
              {completedCount > 0 && (
                <span className="text-[var(--status-success-fg)]">
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  {completedCount}
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-[var(--status-danger-fg)]">
                  <XCircle className="w-4 h-4 inline mr-1" />
                  {errorCount}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </FormDialog>
  )
}
