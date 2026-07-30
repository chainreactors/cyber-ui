import './styles.css'

export { FileManager, type FileManagerProps } from './FileManager'
export type { FileNode, SelectionState, UploadProgress, UploadQueueState, DownloadProgress, DownloadQueueState } from './types'
export type {
  FileManagerNotification,
  FileUploadOptions,
} from './runtime'
export {
  FileManagerError,
  isFileManagerAbortError,
  toFileManagerError,
  validateFileListing,
  type FileAction,
  type FileActionContext,
  type FileEntry,
  type FileEntryKind,
  type FileListing,
  type FileManagerAdapter,
  type FileManagerErrorCode,
  type FileManagerEvent,
  type FileManagerMutation,
  type FileManagerOperation,
  type FileManagerSlots,
  type FileRoot,
  type FileUploadPhase,
  type FileUploadProgressInfo,
  type OperationContext,
  type UploadContext,
} from './contracts'
export {
  FILE_MANAGER_SNAPSHOT_VERSION,
  createLocalStorageFileManagerCache,
  createMemoryFileManagerCache,
  type FileManagerCacheAdapter,
  type FileManagerSnapshot,
} from './cache'
export {
  createFileManagerTranslator,
  enFileManagerMessages,
  zhCNFileManagerMessages,
  type FileManagerLocale,
  type FileManagerMessageKey,
  type FileManagerMessages,
} from './messages'
export {
  getPathStrategy,
  type FilePathStrategy,
  type PathStyle,
} from './path-strategy'
export {
  entryPath,
  formatFileSize,
  formatPathForDisplay,
  inferRootPath,
  normalizePath,
  parentPath,
  parseFileSize,
} from './utils/file-manager-utils'
