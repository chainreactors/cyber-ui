import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FileDrop,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cyber/ui'
import {
  analyzeImportFile,
  buildImportEntry,
  formatFileSize,
  requiresArtifactType,
  type ArtifactOption,
  type ImportDetectionKind,
  type ImportFileEntry,
} from '../../lib/importAnalyzer'

export interface CstxImportDialogLabels {
  title?: string
  description?: string
  dropTitle?: string
  dropDescription?: string
  dropHint?: string
  browseText?: string
  loadingText?: string
  artifactCount?: string
  artifactLoading?: string
  configLabel?: string
  filesPending?: string
  fileColumn?: string
  precheckColumn?: string
  detectionColumn?: string
  summaryColumn?: string
  artifactColumn?: string
  formatColumn?: string
  actionColumn?: string
  structurePass?: string
  structureFail?: string
  needsType?: string
  rawArtifact?: string
  formatPrefix?: string
  preDetectedPrefix?: string
  matchedPrefix?: string
  artifactPlaceholder?: string
  artifactOptional?: string
  removeFile?: string
  invalidFile?: string
  missingArtifactType?: string
  detectionSnapshot?: string
  detectionBundle?: string
  detectionResult?: string
  detectionResults?: string
  detectionArtifact?: string
  detectionUnknown?: string
  detectionArchive?: string
  detectionConflict?: string
  cancel?: string
  submit?: string
  submitting?: string
}

export interface CstxImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (files: ImportFileEntry[]) => Promise<void>
  artifactOptions: ArtifactOption[]
  artifactOptionsLoading?: boolean
  disabled?: boolean
  labels?: CstxImportDialogLabels
  accept?: string
  formats?: string[]
  /** Pre-fill with files dropped from an external zone (e.g. the asset panel).
   *  Bump the array reference to trigger analysis on open. */
  droppedFiles?: File[]
}

const DEFAULTS: Required<CstxImportDialogLabels> = {
  title: 'Import Data',
  description: 'Files are validated and previewed before the backend parses and merges them into the asset pool.',
  dropTitle: 'Drop or select import files',
  dropDescription: 'Select multiple files at once. Files not recognized as snapshot, result, results, or bundle require an artifact type.',
  dropHint: 'Multiple files are supported and will be imported together.',
  browseText: 'Browse files',
  loadingText: 'Importing…',
  artifactCount: '{{count}} artifact type(s) are available from the backend plugin registry. Filename matches are selected automatically.',
  artifactLoading: 'Loading artifacts…',
  configLabel: 'Import configuration',
  filesPending: '{{count}} file(s) pending',
  fileColumn: 'File',
  precheckColumn: 'Precheck',
  detectionColumn: 'Detected as',
  summaryColumn: 'Summary',
  artifactColumn: 'Artifact type',
  formatColumn: 'Raw format',
  actionColumn: 'Action',
  structurePass: 'Passed',
  structureFail: 'Invalid',
  needsType: 'Type required',
  rawArtifact: 'Raw artifact',
  formatPrefix: 'Format:',
  preDetectedPrefix: 'Detected:',
  matchedPrefix: 'Matched:',
  artifactPlaceholder: 'Required',
  artifactOptional: 'Optional',
  removeFile: 'Remove from import list',
  invalidFile: '{{name}} failed validation: {{message}}',
  missingArtifactType: '{{name}} requires an artifact type.',
  detectionSnapshot: 'Snapshot',
  detectionBundle: 'Bundle',
  detectionResult: 'Result',
  detectionResults: 'Results',
  detectionArtifact: 'Artifact',
  detectionUnknown: 'Unknown',
  detectionArchive: 'ZIP archive',
  detectionConflict: 'Ambiguous',
  cancel: 'Cancel',
  submit: 'Start import',
  submitting: 'Importing…',
}

const DEFAULT_ACCEPT = '.json,.jsonl,.ndjson,.yaml,.yml,.csv,.zip,.cstx,.bundle,application/json,application/zip,text/csv,text/plain'
const DEFAULT_FORMATS = ['.json', '.jsonl/.ndjson', '.yaml/.yml', '.csv', '.zip', '.cstx', '.bundle']

export function CstxImportDialog({
  open,
  onOpenChange,
  onSubmit,
  artifactOptions,
  artifactOptionsLoading = false,
  disabled = false,
  labels: userLabels,
  accept = DEFAULT_ACCEPT,
  formats = DEFAULT_FORMATS,
  droppedFiles,
}: CstxImportDialogProps) {
  const l = { ...DEFAULTS, ...userLabels }
  const detectionLabels: Record<ImportDetectionKind, string> = {
    snapshot: l.detectionSnapshot,
    bundle: l.detectionBundle,
    result: l.detectionResult,
    results: l.detectionResults,
    raw_artifact: l.detectionArtifact,
    unknown: l.detectionUnknown,
    archive: l.detectionArchive,
    conflict: l.detectionConflict,
  }
  const [files, setFiles] = useState<ImportFileEntry[]>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!open || !droppedFiles || droppedFiles.length === 0) return
    void Promise.all(droppedFiles.map((f) => analyzeImportFile(f, artifactOptions))).then(setFiles)
  }, [open, droppedFiles])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next)
      if (!next) setFiles([])
    },
    [onOpenChange],
  )

  const handleFilesSelect = useCallback(
    async (selected: File[]) => {
      if (!selected.length) return
      const entries = await Promise.all(selected.map((f) => analyzeImportFile(f, artifactOptions)))
      setFiles(entries)
    },
    [artifactOptions],
  )

  const updateFile = useCallback((id: string, patch: Partial<ImportFileEntry>) => {
    setFiles((cur) => cur.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((cur) => cur.filter((e) => e.id !== id))
  }, [])

  useEffect(() => {
    if (artifactOptions.length === 0) return
    setFiles((cur) =>
      cur.map((entry) => {
        const rebuilt = buildImportEntry(
          entry.file,
          {
            analysisGuess: entry.analysisGuess,
            rawFormat: entry.rawFormat,
            validationStatus: entry.validationStatus,
            validationMessage: entry.validationMessage,
            previewTitle: entry.previewTitle,
            previewDetails: entry.previewDetails,
          },
          artifactOptions,
        )
        return {
          ...entry,
          frontendGuess: rebuilt.frontendGuess,
          matchedArtifacts: rebuilt.matchedArtifacts,
          artifactType: entry.artifactType || rebuilt.artifactType,
        }
      }),
    )
  }, [artifactOptions])

  const validationError = useMemo(() => {
    if (files.length === 0) return null
    const invalid = files.find((e) => e.validationStatus === 'invalid')
    if (invalid) {
      return l.invalidFile
        .replace('{{name}}', invalid.file.name)
        .replace('{{message}}', invalid.validationMessage ?? l.detectionUnknown)
    }
    const missing = files.find((e) => requiresArtifactType(e) && !e.artifactType.trim())
    if (missing) return l.missingArtifactType.replace('{{name}}', missing.file.name)
    return null
  }, [files, l])

  const handleSubmit = useCallback(async () => {
    if (files.length === 0 || validationError) return
    setImporting(true)
    try {
      await onSubmit(files)
      setFiles([])
      handleOpenChange(false)
    } finally {
      setImporting(false)
    }
  }, [files, validationError, onSubmit, handleOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="grid max-h-[92vh] w-[min(96vw,48rem)] max-w-[48rem] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-[48rem]">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle>{l.title}</DialogTitle>
          <DialogDescription className="text-xs">{l.description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-3 overflow-y-auto p-3">
          <FileDrop
            title={l.dropTitle}
            description={l.dropDescription}
            hintText={l.dropHint}
            browseText={l.browseText}
            loadingText={l.loadingText}
            formats={formats}
            accept={accept}
            multiple
            disabled={disabled || importing}
            loading={importing}
            onFilesSelect={handleFilesSelect}
          />

          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {artifactOptionsLoading
              ? l.artifactLoading
              : l.artifactCount.replace('{{count}}', String(artifactOptions.length))}
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{l.configLabel}</span>
                <span className="text-xs text-muted-foreground">
                  {l.filesPending.replace('{{count}}', String(files.length))}
                </span>
              </div>

              <div className="max-h-[30rem] overflow-y-auto rounded-lg border border-border/60 bg-card shadow-sm">
                <div className="hidden border-b border-border/60 bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground lg:grid lg:grid-cols-[minmax(0,3fr)_6rem_6rem_minmax(0,1fr)_8rem_5.5rem_auto] lg:gap-2">
                  <div>{l.fileColumn}</div>
                  <div>{l.precheckColumn}</div>
                  <div>{l.detectionColumn}</div>
                  <div>{l.summaryColumn}</div>
                  <div>{l.artifactColumn}</div>
                  <div>{l.formatColumn}</div>
                  <div className="text-right">{l.actionColumn}</div>
                </div>
                <div className="divide-y divide-border/60">
                  {files.map((entry) => (
                    <div
                      key={entry.id}
                      className="px-3 py-2.5 text-xs lg:grid lg:grid-cols-[minmax(0,3fr)_6rem_6rem_minmax(0,1fr)_8rem_5.5rem_auto] lg:items-center lg:gap-2"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="truncate text-sm font-medium text-foreground" title={entry.file.name}>
                          {entry.file.name}
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatFileSize(entry.file)}</span>
                          <span>{l.formatPrefix} {entry.rawFormat}</span>
                          <span>{l.preDetectedPrefix} {detectionLabels[entry.frontendGuess]}</span>
                          {entry.matchedArtifacts.length > 1 && (
                            <span className="break-all">{l.matchedPrefix} {entry.matchedArtifacts.join(', ')}</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2 lg:mt-0 lg:flex-col lg:items-start lg:gap-1">
                        <Badge variant={entry.validationStatus === 'valid' ? 'secondary' : 'destructive'} size="sm">
                          {entry.validationStatus === 'valid' ? l.structurePass : l.structureFail}
                        </Badge>
                        {requiresArtifactType(entry) && (
                          <span className="text-[11px] font-medium text-warning">{l.needsType}</span>
                        )}
                      </div>

                      <div className="mt-2 lg:mt-0">
                        <Badge variant="outline" size="sm">
                          {entry.analysisGuess === 'raw_artifact'
                            ? l.rawArtifact
                            : detectionLabels[entry.analysisGuess]}
                        </Badge>
                      </div>

                      <div className="mt-2 min-w-0 text-xs lg:mt-0">
                        <div className="truncate font-medium text-foreground" title={entry.previewTitle}>
                          {entry.previewTitle}
                        </div>
                        <div
                          className={entry.validationStatus === 'valid'
                            ? 'truncate text-muted-foreground'
                            : 'truncate text-destructive'}
                          title={[...entry.previewDetails.slice(0, 2), entry.validationMessage]
                            .filter((detail): detail is string => Boolean(detail))
                            .join(' · ')}
                        >
                          {[...entry.previewDetails.slice(0, 2), entry.validationMessage]
                            .filter((detail): detail is string => Boolean(detail))
                            .join(' · ')}
                        </div>
                      </div>

                      <div className="mt-2 space-y-1 lg:mt-0">
                        <div className="text-[11px] text-muted-foreground lg:hidden">{l.artifactColumn}</div>
                        <Select
                          value={entry.artifactType}
                          onValueChange={(v) => updateFile(entry.id, { artifactType: v })}
                          disabled={
                            entry.frontendGuess === 'snapshot' ||
                            entry.frontendGuess === 'bundle' ||
                            entry.frontendGuess === 'archive'
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue
                              placeholder={requiresArtifactType(entry) ? l.artifactPlaceholder : l.artifactOptional}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {artifactOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mt-2 space-y-1 lg:mt-0">
                        <div className="text-[11px] text-muted-foreground lg:hidden">{l.formatColumn}</div>
                        <Input
                          value={entry.rawFormat}
                          onChange={(e) => updateFile(entry.id, { rawFormat: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="mt-2 flex justify-end lg:mt-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeFile(entry.id)}
                          disabled={importing}
                          title={l.removeFile}
                          aria-label={l.removeFile}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {validationError && (
                <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
                  {validationError}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 px-4 py-3">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            {l.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={importing || files.length === 0 || Boolean(validationError)}
          >
            {importing ? l.submitting : l.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

