import type { ReactNode } from 'react'

import { getPathStrategy, type PathStyle } from './path-strategy'

export type { PathStyle } from './path-strategy'

export type FileEntryKind = 'file' | 'directory' | 'symlink'

export interface FileEntry {
  id: string
  path: string
  name: string
  kind: FileEntryKind
  sizeBytes?: number
  modifiedAt?: number
  mode?: string
  linkTarget?: string
  metadata?: Record<string, unknown>
}

export interface FileRoot {
  path: string
  label?: string
  metadata?: Record<string, unknown>
}

export interface FileListing {
  path: string
  entries: FileEntry[]
}

export interface OperationContext {
  signal: AbortSignal
  requestId: string
  fresh?: boolean
}

export type FileUploadPhase = 'uploading' | 'staged' | 'delivering'

export interface FileUploadProgressInfo {
  nextOffset?: number
  totalSize?: number
  progress: number
  phase: FileUploadPhase
}

export interface UploadContext extends OperationContext {
  onProgress?: (info: FileUploadProgressInfo) => void
}

export interface FileManagerAdapter {
  pathStyle: PathStyle
  list(path: string, context: OperationContext): Promise<FileListing>
  cwd?(context: OperationContext): Promise<string>
  roots?(context: OperationContext): Promise<FileRoot[]>
  createDirectory?(path: string, context: OperationContext): Promise<void>
  createFile?(path: string, context: OperationContext): Promise<void>
  upload?(file: File, targetPath: string, context: UploadContext): Promise<void>
  download?(entry: FileEntry, context: OperationContext): Promise<void>
  downloadUrl?(entry: FileEntry, context: OperationContext): string | undefined
  remove?(entry: FileEntry, context: OperationContext): Promise<void>
  rename?(entry: FileEntry, destination: string, context: OperationContext): Promise<void>
  copy?(entry: FileEntry, destination: string, context: OperationContext): Promise<void>
  chmod?(entry: FileEntry, mode: string, context: OperationContext): Promise<void>
}

export type FileManagerErrorCode =
  | 'not-found'
  | 'timeout'
  | 'offline'
  | 'permission'
  | 'aborted'
  | 'busy'
  | 'invalid-data'
  | 'unsupported'
  | 'unknown'

export class FileManagerError extends Error {
  readonly code: FileManagerErrorCode
  readonly cause?: unknown

  constructor(code: FileManagerErrorCode, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'FileManagerError'
    this.code = code
    this.cause = options?.cause
  }
}

export type FileManagerOperation =
  | 'list'
  | 'cwd'
  | 'roots'
  | 'mkdir'
  | 'createFile'
  | 'upload'
  | 'download'
  | 'remove'
  | 'rename'
  | 'copy'
  | 'chmod'

export type FileManagerMutation = Exclude<FileManagerOperation, 'list' | 'cwd' | 'roots'>

export type FileActionPlacement = 'primary' | 'menu' | 'danger'

export interface FileActionContext {
  entry?: FileEntry
  selectedEntries: FileEntry[]
  targetPath: string
  location: 'file' | 'directory' | 'background'
}

export interface FileAction {
  id: string
  label: string
  icon?: ReactNode
  placement?: FileActionPlacement
  disabled?: boolean
  run(context: FileActionContext): void | Promise<void>
}

export interface FileManagerSlots {
  preview?: (entry: FileEntry) => ReactNode
}

export type FileManagerEvent =
  | {
      type: 'operation-started'
      operation: FileManagerOperation
      requestId: string
    }
  | {
      type: 'operation-succeeded'
      operation: FileManagerMutation
      requestId: string
      entries: FileEntry[]
    }
  | {
      type: 'operation-failed'
      operation: FileManagerOperation
      requestId: string
      error: FileManagerError
    }

function invalidData(message: string): never {
  throw new FileManagerError('invalid-data', message)
}

function isWithinDirectory(path: string, directory: string, style: PathStyle): boolean {
  const strategy = getPathStrategy(style)
  const normalizedPath = strategy.normalize(path)
  const normalizedDirectory = strategy.normalize(directory)
  const comparePath = style === 'windows' ? normalizedPath.toLowerCase() : normalizedPath
  const compareDirectory = style === 'windows' ? normalizedDirectory.toLowerCase() : normalizedDirectory
  if (comparePath === compareDirectory) return true
  return comparePath.startsWith(compareDirectory.endsWith('/') ? compareDirectory : `${compareDirectory}/`)
}

export function validateFileListing(listing: FileListing, style: PathStyle): FileListing {
  if (!listing || typeof listing !== 'object') invalidData('File listing must be an object')
  if (!Array.isArray(listing.entries)) invalidData('File listing entries must be an array')

  const strategy = getPathStrategy(style)
  const normalizedListingPath = strategy.normalize(listing.path)
  if (listing.path !== normalizedListingPath) {
    invalidData(`File listing path is not canonical: ${listing.path}`)
  }

  for (const entry of listing.entries) {
    if (!entry.id?.trim()) invalidData('File entry id must be non-empty')
    if (!entry.name?.trim()) invalidData(`File entry name must be non-empty: ${entry.id}`)
    if (!['file', 'directory', 'symlink'].includes(entry.kind)) {
      invalidData(`File entry kind is invalid: ${entry.id}`)
    }
    if (entry.path !== strategy.normalize(entry.path)) {
      invalidData(`File entry path is not canonical: ${entry.path}`)
    }
    if (!isWithinDirectory(entry.path, listing.path, style)) {
      invalidData(`File entry is outside the listing path: ${entry.path}`)
    }
    if (entry.sizeBytes !== undefined && (
      typeof entry.sizeBytes !== 'number' ||
      !Number.isFinite(entry.sizeBytes) ||
      entry.sizeBytes < 0
    )) {
      invalidData(`File entry sizeBytes must be a non-negative number: ${entry.id}`)
    }
    if (entry.modifiedAt !== undefined && (
      typeof entry.modifiedAt !== 'number' ||
      !Number.isFinite(entry.modifiedAt) ||
      entry.modifiedAt < 0
    )) {
      invalidData(`File entry modifiedAt must be a non-negative timestamp: ${entry.id}`)
    }
  }

  return listing
}

export function toFileManagerError(error: unknown): FileManagerError {
  if (error instanceof FileManagerError) return error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new FileManagerError('aborted', error.message, { cause: error })
  }

  const message = error instanceof Error ? error.message : String(error)
  if (/not found|no such file|404/i.test(message)) {
    return new FileManagerError('not-found', message, { cause: error })
  }
  if (/timeout|timed out|deadline_exceeded/i.test(message)) {
    return new FileManagerError('timeout', message, { cause: error })
  }
  if (/offline|disconnected|unavailable/i.test(message)) {
    return new FileManagerError('offline', message, { cause: error })
  }
  if (/permission|forbidden|access denied|403/i.test(message)) {
    return new FileManagerError('permission', message, { cause: error })
  }
  return new FileManagerError('unknown', message || 'Unknown file manager error', { cause: error })
}

export function isFileManagerAbortError(error: unknown): boolean {
  if (error instanceof FileManagerError) return error.code === 'aborted'
  return typeof DOMException !== 'undefined'
    && error instanceof DOMException
    && error.name === 'AbortError'
}
