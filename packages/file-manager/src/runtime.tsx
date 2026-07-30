import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  FileManagerError,
  toFileManagerError,
  validateFileListing,
  type FileAction,
  type FileActionContext,
  type FileEntry,
  type FileManagerAdapter,
  type FileManagerEvent,
  type FileManagerMutation,
  type FileManagerOperation,
  type FileRoot,
  type FileUploadPhase,
  type FileUploadProgressInfo,
  type OperationContext,
} from './contracts'
import {
  FILE_MANAGER_SNAPSHOT_VERSION,
  type FileManagerCacheAdapter,
  type FileManagerSnapshot,
} from './cache'
import { FileManagerRequestManager } from './request-manager'
import { getPathStrategy, pathsOverlap, type PathStyle } from './path-strategy'
import { entryPath, inferRootPath, parentPath, parseFileSize } from './utils/file-manager-utils'
import type { FileNode } from './types'

export type {
  FileManagerAdapter,
  FileManagerOperation,
  FileRoot,
  FileUploadPhase,
  FileUploadProgressInfo,
  OperationContext,
} from './contracts'

export interface FileUploadOptions {
  signal?: AbortSignal
  onProgress?: (info: FileUploadProgressInfo) => void
}

export interface FileManagerNotification {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export interface FileManagerRuntimeValue {
  adapter: FileManagerAdapter
  cache: FileManagerCacheAdapter | false
  capabilities: {
    roots: boolean
    mkdir: boolean
    createFile: boolean
    upload: boolean
    download: boolean
    remove: boolean
    rename: boolean
    copy: boolean
    chmod: boolean
    preview: boolean
  }
  getActions?: (context: FileActionContext) => FileAction[]
  initialPath: string
  historyKey: string
  maxHistory: number
  notify(notification: FileManagerNotification): void
  onEvent?: (event: FileManagerEvent) => void
  onOpenFile?: (entry: FileNode) => void
  onOperationError?: (operation: FileManagerOperation, error: unknown) => void
  onOperationSuccess?: (
    operation: FileManagerMutation,
    entries: FileNode[],
  ) => void
  renderPreview?: (entry: FileNode) => ReactNode
  requestManager: FileManagerRequestManager
  scopeKey: string
  translate(key: string, values?: Record<string, unknown>): string
}

const RuntimeContext = createContext<FileManagerRuntimeValue | null>(null)

export function FileManagerRuntimeProvider({
  children,
  value,
}: {
  children: ReactNode
  value: FileManagerRuntimeValue
}) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}

export function useFileManagerRuntime(): FileManagerRuntimeValue {
  const value = useContext(RuntimeContext)
  if (!value) throw new Error('@cyber/file-manager must be rendered inside FileManagerRuntimeProvider')
  return value
}

export function useFileManagerTranslations() {
  return useFileManagerRuntime().translate
}

export function fileEntryToNode(entry: FileEntry): FileNode {
  return {
    id: entry.id,
    name: entry.name,
    path: entry.path,
    fullPath: entry.path,
    isDirectory: entry.kind === 'directory',
    size: entry.sizeBytes,
    mode: entry.mode,
    link: entry.linkTarget,
    modifiedAt: entry.modifiedAt,
    time: entry.modifiedAt === undefined ? undefined : new Date(entry.modifiedAt).toISOString(),
    metadata: {
      ...entry.metadata,
      kind: entry.kind,
    },
  }
}

export function fileNodeToEntry(node: FileNode, pathStyle?: PathStyle): FileEntry {
  const sourcePath = node.fullPath || node.path || node.id
  const path = pathStyle ? getPathStrategy(pathStyle).normalize(sourcePath) : sourcePath
  const metadataKind = node.metadata?.kind
  const kind = metadataKind === 'symlink' || node.link
    ? 'symlink'
    : node.isDirectory
      ? 'directory'
      : 'file'
  const modifiedValue = node.modifiedAt ?? node.time
  const modifiedAt = modifiedValue instanceof Date
    ? modifiedValue.getTime()
    : typeof modifiedValue === 'number'
      ? modifiedValue
      : modifiedValue
        ? Date.parse(modifiedValue)
        : undefined
  const sizeBytes = node.isDirectory ? undefined : parseFileSize(node.size)

  return {
    id: node.id || path,
    path,
    name: node.name,
    kind,
    sizeBytes: sizeBytes !== undefined && Number.isFinite(sizeBytes) && sizeBytes >= 0
      ? sizeBytes
      : undefined,
    modifiedAt: modifiedAt !== undefined && Number.isFinite(modifiedAt) ? modifiedAt : undefined,
    mode: node.mode,
    linkTarget: node.link,
    metadata: node.metadata,
  }
}

export function useFileSystem() {
  const runtime = useFileManagerRuntime()
  const pathStrategy = useMemo(
    () => getPathStrategy(runtime.adapter.pathStyle),
    [runtime.adapter.pathStyle],
  )
  const [pendingCount, setPendingCount] = useState(0)
  const mutationLocksRef = useRef(new Set<string>())
  const [pendingMutationPaths, setPendingMutationPaths] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [error, setError] = useState<string | null>(null)

  const invoke = async <T,>(
    operation: FileManagerOperation,
    requestKey: string,
    action: (context: OperationContext) => Promise<T> | T,
    mutationPaths: string[] = [],
  ): Promise<{ context: OperationContext; value: T }> => {
    const lockPaths = [...new Set(mutationPaths)]
    const conflictingPath = lockPaths.find((path) => (
      [...mutationLocksRef.current].some((activePath) => (
        pathsOverlap(path, activePath, runtime.adapter.pathStyle)
      ))
    ))
    if (conflictingPath) {
      throw new FileManagerError(
        'busy',
        `Another file operation is already running for ${conflictingPath}`,
      )
    }

    if (lockPaths.length > 0) {
      for (const path of lockPaths) mutationLocksRef.current.add(path)
      setPendingMutationPaths(new Set(mutationLocksRef.current))
    }

    const request = runtime.requestManager.begin(requestKey)
    setPendingCount((count) => count + 1)
    setError(null)
    runtime.onEvent?.({
      type: 'operation-started',
      operation,
      requestId: request.context.requestId,
    })

    try {
      const value = await action(request.context)
      if (request.context.signal.aborted) {
        throw new DOMException('Operation aborted', 'AbortError')
      }
      return {
        context: request.context,
        value,
      }
    } catch (reason) {
      const next = toFileManagerError(reason)
      if (next.code !== 'aborted') {
        setError(next.message)
        runtime.onOperationError?.(operation, next)
      }
      runtime.onEvent?.({
        type: 'operation-failed',
        operation,
        requestId: request.context.requestId,
        error: next,
      })
      throw next
    } finally {
      request.complete()
      setPendingCount((count) => Math.max(0, count - 1))
      if (lockPaths.length > 0) {
        for (const path of lockPaths) mutationLocksRef.current.delete(path)
        setPendingMutationPaths(new Set(mutationLocksRef.current))
      }
    }
  }

  const notifySuccess = (
    operation: FileManagerMutation,
    context: OperationContext,
    entries: FileNode[],
  ) => {
    runtime.onOperationSuccess?.(operation, entries)
    runtime.onEvent?.({
      type: 'operation-succeeded',
      operation,
      requestId: context.requestId,
      entries: entries.map((entry) => fileNodeToEntry(entry, runtime.adapter.pathStyle)),
    })
  }

  const nodeForPath = (path: string, isDirectory = false): FileNode => ({
    id: pathStrategy.normalize(path),
    name: pathStrategy.name(path),
    fullPath: pathStrategy.normalize(path),
    isDirectory,
  })

  return {
    listDirectory: async (path: string, forceFresh = false) => {
      const canonicalPath = pathStrategy.normalize(path)
      const { value } = await invoke('list', `list:${canonicalPath}`, async (context) => {
        const listing = validateFileListing(
          await runtime.adapter.list(canonicalPath, {
            ...context,
            fresh: forceFresh,
          }),
          runtime.adapter.pathStyle,
        )
        return listing.entries.map(fileEntryToNode)
      })
      return value
    },
    listRoots: async () => {
      const { value } = await invoke('roots', 'roots', async (context) => (
        runtime.adapter.roots ? runtime.adapter.roots(context) : []
      ))
      return value.map((root: FileRoot) => ({
        path: pathStrategy.normalize(root.path),
        label: root.label,
      }))
    },
    createDirectory: async (path: string) => {
      if (!runtime.adapter.createDirectory) {
        throw new FileManagerError('unsupported', 'Creating directories is not supported')
      }
      const canonicalPath = pathStrategy.normalize(path)
      const { context } = await invoke('mkdir', `mkdir:${canonicalPath}`, (operationContext) => (
        runtime.adapter.createDirectory!(canonicalPath, operationContext)
      ), [canonicalPath])
      notifySuccess('mkdir', context, [nodeForPath(canonicalPath, true)])
    },
    createFileEntry: async (path: string) => {
      if (!runtime.adapter.createFile) {
        throw new FileManagerError('unsupported', 'Creating files is not supported')
      }
      const canonicalPath = pathStrategy.normalize(path)
      const { context } = await invoke('createFile', `createFile:${canonicalPath}`, (operationContext) => (
        runtime.adapter.createFile!(canonicalPath, operationContext)
      ), [canonicalPath])
      notifySuccess('createFile', context, [nodeForPath(canonicalPath)])
    },
    uploadFile: async (
      fileName: string,
      targetPath: string,
      data: Blob | ArrayBuffer,
      options?: FileUploadOptions,
    ) => {
      if (!runtime.adapter.upload) {
        throw new FileManagerError('unsupported', 'Uploading is not supported')
      }
      const file = data instanceof File && data.name === fileName
        ? data
        : new File([data], fileName)
      const canonicalTargetPath = pathStrategy.normalize(targetPath)
      const requestKey = `upload:${canonicalTargetPath}:${fileName}`
      const { context } = await invoke('upload', requestKey, (operationContext) => {
        if (options?.signal?.aborted) {
          throw new DOMException('Upload aborted', 'AbortError')
        }

        const forwardAbort = () => runtime.requestManager.abort(requestKey)
        options?.signal?.addEventListener('abort', forwardAbort, { once: true })
        return runtime.adapter.upload!(file, canonicalTargetPath, {
          ...operationContext,
          onProgress: options?.onProgress,
        }).finally(() => {
          options?.signal?.removeEventListener('abort', forwardAbort)
        })
      }, [canonicalTargetPath])
      notifySuccess('upload', context, [nodeForPath(canonicalTargetPath)])
    },
    downloadFile: async (
      path: string,
      options?: { name?: string; dir?: boolean; bufferSize?: number },
    ) => {
      const canonicalPath = pathStrategy.normalize(path)
      const node = {
        ...nodeForPath(canonicalPath, options?.dir),
        name: options?.name || nodeForPath(path).name,
      }
      const entry = fileNodeToEntry(node, runtime.adapter.pathStyle)
      const { context } = await invoke('download', `download:${canonicalPath}`, async (operationContext) => {
        if (runtime.adapter.download) {
          await runtime.adapter.download(entry, operationContext)
          return
        }

        const url = runtime.adapter.downloadUrl?.(entry, operationContext)
        if (!url) throw new FileManagerError('unsupported', 'Downloading is not supported')
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = entry.name
        anchor.click()
      })
      notifySuccess('download', context, [node])
    },
    removeEntry: async (path: string) => {
      if (!runtime.adapter.remove) {
        throw new FileManagerError('unsupported', 'Deleting is not supported')
      }
      const canonicalPath = pathStrategy.normalize(path)
      const node = nodeForPath(canonicalPath)
      const { context } = await invoke('remove', `remove:${canonicalPath}`, (operationContext) => (
        runtime.adapter.remove!(fileNodeToEntry(node, runtime.adapter.pathStyle), operationContext)
      ), [canonicalPath])
      notifySuccess('remove', context, [node])
    },
    renameEntry: async (source: string, destination: string) => {
      if (!runtime.adapter.rename) {
        throw new FileManagerError('unsupported', 'Renaming is not supported')
      }
      const canonicalSource = pathStrategy.normalize(source)
      const canonicalDestination = pathStrategy.normalize(destination)
      const node = nodeForPath(canonicalSource)
      const { context } = await invoke('rename', `rename:${canonicalSource}`, (operationContext) => (
        runtime.adapter.rename!(
          fileNodeToEntry(node, runtime.adapter.pathStyle),
          canonicalDestination,
          operationContext,
        )
      ), [canonicalSource, canonicalDestination])
      notifySuccess('rename', context, [{ ...node, id: canonicalDestination, fullPath: canonicalDestination }])
    },
    copyEntry: async (source: string, destination: string) => {
      if (!runtime.adapter.copy) {
        throw new FileManagerError('unsupported', 'Copying is not supported')
      }
      const canonicalSource = pathStrategy.normalize(source)
      const canonicalDestination = pathStrategy.normalize(destination)
      const node = nodeForPath(canonicalSource)
      const { context } = await invoke('copy', `copy:${canonicalSource}:${canonicalDestination}`, (operationContext) => (
        runtime.adapter.copy!(
          fileNodeToEntry(node, runtime.adapter.pathStyle),
          canonicalDestination,
          operationContext,
        )
      ), [canonicalSource, canonicalDestination])
      notifySuccess('copy', context, [{ ...node, id: canonicalDestination, fullPath: canonicalDestination }])
    },
    changeMode: async (path: string, mode: string) => {
      if (!runtime.adapter.chmod) {
        throw new FileManagerError('unsupported', 'Changing permissions is not supported')
      }
      const canonicalPath = pathStrategy.normalize(path)
      const node = nodeForPath(canonicalPath)
      const { context } = await invoke('chmod', `chmod:${canonicalPath}`, (operationContext) => (
        runtime.adapter.chmod!(
          fileNodeToEntry(node, runtime.adapter.pathStyle),
          mode,
          operationContext,
        )
      ), [canonicalPath])
      notifySuccess('chmod', context, [node])
    },
    getCurrentDirectory: async () => {
      if (!runtime.adapter.cwd) return runtime.initialPath
      const { value } = await invoke('cwd', 'cwd', (context) => runtime.adapter.cwd!(context))
      return pathStrategy.normalize(value)
    },
    loading: pendingCount > 0,
    pendingMutationPaths,
    error,
  }
}

export interface FileTreeCacheData extends Record<string, unknown> {
  currentPath?: string
  treeData?: FileNode[]
}

export function useFileManagerCache() {
  const { cache, scopeKey } = useFileManagerRuntime()
  const memoryRef = useRef<FileTreeCacheData | undefined>(undefined)
  const pendingRef = useRef<Promise<void> | null>(null)

  return useMemo(() => ({
    getFileTreeCache: () => memoryRef.current,
    setFileTreeCache: (value: FileTreeCacheData) => {
      if (cache === false) return
      memoryRef.current = value
      const snapshot: FileManagerSnapshot = {
        version: FILE_MANAGER_SNAPSHOT_VERSION,
        savedAt: Date.now(),
        currentPath: String(value.currentPath || ''),
        expandedPaths: Array.isArray(value.expandedNodes)
          ? value.expandedNodes.filter((path): path is string => typeof path === 'string')
          : [],
        viewMode: value.viewMode === 'grid' ? 'grid' : 'list',
        data: value,
      }
      pendingRef.current = cache.save(scopeKey, snapshot).catch(() => undefined)
    },
    loadFileTreeCache: async () => {
      if (cache === false) return undefined
      const snapshot = await cache.load(scopeKey)
      if (!snapshot) return undefined
      const data = snapshot.data as FileTreeCacheData
      memoryRef.current = data
      return data
    },
    flushFileTreeCache: async () => {
      if (cache === false) return
      await pendingRef.current
      await cache.flush?.(scopeKey)
      pendingRef.current = null
    },
  }), [cache, scopeKey])
}

export function isFileNotFoundError(error: unknown): boolean {
  return error instanceof FileManagerError
    ? error.code === 'not-found'
    : /not found|no such file|404/i.test(error instanceof Error ? error.message : String(error))
}

export function inferInitialRoot(initialPath: string): string {
  return inferRootPath(initialPath)
}

export function parentOf(path: string, root?: string): string {
  return parentPath(path, root || inferRootPath(path))
}
