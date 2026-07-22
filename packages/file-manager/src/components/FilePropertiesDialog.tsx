"use client"

import React from 'react'
import { useTranslations } from '../runtime'
import { FormDialog } from '../ui'
import type { FileNode } from '../types'

interface FilePropertiesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileNode | null
  isWindows: boolean
}

export function FilePropertiesDialog({
  open,
  onOpenChange,
  file,
  isWindows,
}: FilePropertiesDialogProps) {
  const t = useTranslations('Sessions.fileManagement')

  if (!file) return null

  const properties = [
    {
      label: t('properties.name'),
      value: file.name,
    },
    {
      label: t('properties.path'),
      value: file.fullPath || '-',
    },
    {
      label: t('properties.type'),
      value: file.isDirectory ? t('properties.folder') : t('properties.file'),
    },
    {
      label: t('properties.size'),
      value: file.size || '-',
    },
    {
      label: t('properties.modified'),
      value: file.time || '-',
    },
    ...(file.link
      ? [
          {
            label: t('properties.link'),
            value: file.link,
          },
        ]
      : []),
    ...(file.mode
      ? [
          {
            label: t('mode'),
            value: file.mode,
          },
        ]
      : []),
  ]

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('properties.title')}
      hideFooter
      maxWidth="md"
    >
      <div className="space-y-3">
        {properties.map(({ label, value }) => (
          <div key={label} className="flex items-start gap-4">
            <span className="text-sm font-normal text-muted-foreground w-28 flex-shrink-0">
              {label}:
            </span>
            <span className="text-sm text-foreground break-all flex-1">{value}</span>
          </div>
        ))}
      </div>
    </FormDialog>
  )
}
