"use client"

import React, { useState, useEffect } from 'react'
import { useTranslations } from '../runtime'
import { FormDialog } from '../ui'
import { Checkbox } from '../ui'
import { Label } from '../ui'
import type { FileNode } from '../types'

interface PermissionEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileNode | null
  onSave: (mode: number) => Promise<void>
}

interface PermissionSet {
  read: boolean
  write: boolean
  execute: boolean
}

interface Permissions {
  owner: PermissionSet
  group: PermissionSet
  others: PermissionSet
}

export function PermissionEditor({
  open,
  onOpenChange,
  file,
  onSave,
}: PermissionEditorProps) {
  const t = useTranslations('Sessions.fileManagement')
  const [permissions, setPermissions] = useState<Permissions>({
    owner: { read: false, write: false, execute: false },
    group: { read: false, write: false, execute: false },
    others: { read: false, write: false, execute: false },
  })
  const [isSaving, setIsSaving] = useState(false)

  // Parse Unix permission string (e.g., "drwxr-xr--")
  useEffect(() => {
    if (file?.mode) {
      const modeStr = file.mode.substring(1) // Remove first character (file type)
      setPermissions({
        owner: {
          read: modeStr[0] === 'r',
          write: modeStr[1] === 'w',
          execute: modeStr[2] === 'x',
        },
        group: {
          read: modeStr[3] === 'r',
          write: modeStr[4] === 'w',
          execute: modeStr[5] === 'x',
        },
        others: {
          read: modeStr[6] === 'r',
          write: modeStr[7] === 'w',
          execute: modeStr[8] === 'x',
        },
      })
    }
  }, [file?.mode])

  // Calculate octal mode from permissions
  const calculateOctalMode = () => {
    const ownerBits =
      (permissions.owner.read ? 4 : 0) +
      (permissions.owner.write ? 2 : 0) +
      (permissions.owner.execute ? 1 : 0)
    const groupBits =
      (permissions.group.read ? 4 : 0) +
      (permissions.group.write ? 2 : 0) +
      (permissions.group.execute ? 1 : 0)
    const othersBits =
      (permissions.others.read ? 4 : 0) +
      (permissions.others.write ? 2 : 0) +
      (permissions.others.execute ? 1 : 0)

    return parseInt(`${ownerBits}${groupBits}${othersBits}`, 8)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const mode = calculateOctalMode()
      await onSave(mode)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const PermissionRow = ({
    label,
    type,
  }: {
    label: string
    type: 'owner' | 'group' | 'others'
  }) => (
    <div className="flex items-center gap-6">
      <span className="text-sm font-normal w-20">{label}</span>
      <div className="flex items-center gap-4">
        <Label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={permissions[type].read}
            onCheckedChange={(checked) =>
              setPermissions((prev) => ({
                ...prev,
                [type]: { ...prev[type], read: !!checked },
              }))
            }
          />
          <span className="text-sm">{t('permissions.read')}</span>
        </Label>
        <Label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={permissions[type].write}
            onCheckedChange={(checked) =>
              setPermissions((prev) => ({
                ...prev,
                [type]: { ...prev[type], write: !!checked },
              }))
            }
          />
          <span className="text-sm">{t('permissions.write')}</span>
        </Label>
        <Label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={permissions[type].execute}
            onCheckedChange={(checked) =>
              setPermissions((prev) => ({
                ...prev,
                [type]: { ...prev[type], execute: !!checked },
              }))
            }
          />
          <span className="text-sm">{t('permissions.execute')}</span>
        </Label>
      </div>
    </div>
  )

  if (!file) return null

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('permissions.editTitle')}
      onSubmit={handleSave}
      submitText={t('common.save')}
      isSubmitting={isSaving}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {t('permissions.file')}: <span className="font-normal text-foreground">{file.name}</span>
        </div>

        <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
          <PermissionRow label={t('permissions.owner')} type="owner" />
          <PermissionRow label={t('permissions.group')} type="group" />
          <PermissionRow label={t('permissions.others')} type="others" />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('permissions.octal')}:</span>
          <code className="px-2 py-1 bg-muted rounded font-mono text-foreground">
            {calculateOctalMode().toString(8).padStart(3, '0')}
          </code>
        </div>
      </div>
    </FormDialog>
  )
}
