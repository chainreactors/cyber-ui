// File management types

export interface FileNode {
  id: string
  name: string
  isDirectory?: boolean
  path?: string
  fullPath?: string
  size?: string | number
  mode?: string
  link?: string
  time?: string
  modifiedAt?: string | number | Date
  metadata?: Record<string, unknown>
  children?: FileNode[]
  isLazy?: boolean
}

export interface SelectionState {
  selectedIds: Set<string>
  lastSelectedId: string | null
  selectRange: boolean
}

export type UploadItemStatus =
  | 'pending'
  | 'uploading'
  | 'staged'
  | 'delivering'
  | 'completed'
  | 'error'
  | 'canceled'

export interface UploadProgress {
  /** Stable queue identity; file names are not unique within a batch. */
  id: string
  fileName: string
  totalSize?: number
  progress: number
  status: UploadItemStatus
  error?: string
}

export interface UploadQueueState {
  progresses: Map<string, UploadProgress>
  currentIndex: number
  totalFiles: number
  aborted?: boolean
}

// Download progress types
export interface DownloadProgress {
  fileName: string
  filePath: string
  progress: number // 0-100
  status: 'pending' | 'downloading' | 'completed' | 'error'
  error?: string
}

export interface DownloadQueueState {
  progresses: Map<string, DownloadProgress>
  totalFiles: number
}
