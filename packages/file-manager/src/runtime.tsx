import React, { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { entryPath, inferRootPath, parentPath } from './utils/file-manager-utils'
import type { FileNode } from './types'

export type FileManagerOperation =
  | 'list'
  | 'roots'
  | 'mkdir'
  | 'createFile'
  | 'upload'
  | 'download'
  | 'remove'
  | 'rename'
  | 'copy'
  | 'chmod'

export interface FileRoot {
  path: string
  label?: string
}

export interface FileListing {
  path: string
  entries: FileNode[]
}

export interface FileManagerAdapter {
  list(path: string): Promise<FileListing | FileNode[]>
  cwd?(): Promise<string>
  roots?(): Promise<FileRoot[]>
  mkdir?(path: string): Promise<void>
  createFile?(path: string): Promise<void>
  upload?(file: File, targetPath: string): Promise<void>
  download?(entry: FileNode): Promise<void>
  downloadUrl?(entry: FileNode): string | undefined
  remove?(entry: FileNode): Promise<void>
  rename?(entry: FileNode, destination: string): Promise<void>
  copy?(entry: FileNode, destination: string): Promise<void>
  chmod?(entry: FileNode, mode: string): Promise<void>
  readFile?(entry: FileNode): Promise<ReactNode>
}

export interface FileManagerNotification {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export interface FileManagerRuntimeValue {
  adapter: FileManagerAdapter
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
  initialPath: string
  historyKey: string
  maxHistory: number
  notify(notification: FileManagerNotification): void
  onOpenFile?: (entry: FileNode) => void
  onOperationError?: (operation: FileManagerOperation, error: unknown) => void
  onOperationSuccess?: (operation: Exclude<FileManagerOperation, 'list' | 'roots'>, entries: FileNode[]) => void
  renderPreview?: (entry: FileNode) => ReactNode
  sourceKey: string
  translate(key: string, values?: Record<string, unknown>): string
}

const RuntimeContext = createContext<FileManagerRuntimeValue | null>(null)

export function FileManagerRuntimeProvider({ children, value }: { children: ReactNode; value: FileManagerRuntimeValue }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}

export function useFileManagerRuntime(): FileManagerRuntimeValue {
  const value = useContext(RuntimeContext)
  if (!value) throw new Error('@cyber/file-manager must be rendered inside FileManagerRuntimeProvider')
  return value
}

export function useTranslations(_namespace?: string) {
  return useFileManagerRuntime().translate
}

export function useFileSystem() {
  const runtime = useFileManagerRuntime()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invoke = async <T,>(operation: FileManagerOperation, action: () => Promise<T>): Promise<T> => {
    setLoading(true)
    setError(null)
    try {
      return await action()
    } catch (reason) {
      const next = reason instanceof Error ? reason : new Error(String(reason))
      setError(next.message)
      runtime.onOperationError?.(operation, reason)
      throw reason
    } finally {
      setLoading(false)
    }
  }

  const nodeForPath = (path: string, isDirectory = false): FileNode => ({
    id: path,
    name: path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || path,
    fullPath: path,
    isDirectory,
  })

  return {
    listFiles: async (_sessionId: string, path: string) => invoke('list', async () => {
      const result = await runtime.adapter.list(path)
      const listing = Array.isArray(result) ? { path, entries: result } : result
      return (listing.entries || []).map((entry) => ({
        ...entry,
        id: entry.id || entryPath(listing.path || path, entry),
        fullPath: entry.fullPath || entry.path || entryPath(listing.path || path, entry),
        isDirectory: !!entry.isDirectory,
      }))
    }),
    enumDriversFromAPI: async (_sessionId: string) => invoke('roots', async () => {
      const roots = runtime.adapter.roots ? await runtime.adapter.roots() : []
      return roots.map((root) => ({ path: root.path, label: root.label }))
    }),
    mkdir: async (_sessionId: string, path: string) => invoke('mkdir', async () => {
      if (!runtime.adapter.mkdir) throw new Error('Creating directories is not supported')
      await runtime.adapter.mkdir(path)
      runtime.onOperationSuccess?.('mkdir', [nodeForPath(path, true)])
    }),
    touchFile: async (_sessionId: string, path: string) => invoke('createFile', async () => {
      if (!runtime.adapter.createFile) throw new Error('Creating files is not supported')
      await runtime.adapter.createFile(path)
      runtime.onOperationSuccess?.('createFile', [nodeForPath(path)])
    }),
    uploadFile: async (_sessionId: string, fileName: string, targetPath: string, data: ArrayBuffer, _options?: { override?: boolean }) => invoke('upload', async () => {
      if (!runtime.adapter.upload) throw new Error('Uploading is not supported')
      const file = new File([data], fileName)
      await runtime.adapter.upload(file, targetPath)
      runtime.onOperationSuccess?.('upload', [nodeForPath(targetPath)])
    }),
    downloadFile: async (_sessionId: string, path: string, options?: { name?: string; dir?: boolean; bufferSize?: number }) => invoke('download', async () => {
      const entry = { ...nodeForPath(path, options?.dir), name: options?.name || nodeForPath(path).name }
      if (runtime.adapter.download) {
        await runtime.adapter.download(entry)
      } else {
        const url = runtime.adapter.downloadUrl?.(entry)
        if (!url) throw new Error('Downloading is not supported')
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = entry.name
        anchor.click()
      }
      runtime.onOperationSuccess?.('download', [entry])
    }),
    rmFile: async (_sessionId: string, path: string) => invoke('remove', async () => {
      if (!runtime.adapter.remove) throw new Error('Deleting is not supported')
      const entry = nodeForPath(path)
      await runtime.adapter.remove(entry)
      runtime.onOperationSuccess?.('remove', [entry])
    }),
    mvFile: async (_sessionId: string, source: string, destination: string) => invoke('rename', async () => {
      if (!runtime.adapter.rename) throw new Error('Renaming is not supported')
      const entry = nodeForPath(source)
      await runtime.adapter.rename(entry, destination)
      runtime.onOperationSuccess?.('rename', [{ ...entry, id: destination, fullPath: destination }])
    }),
    cpFile: async (_sessionId: string, source: string, destination: string) => invoke('copy', async () => {
      if (!runtime.adapter.copy) throw new Error('Copying is not supported')
      const entry = nodeForPath(source)
      await runtime.adapter.copy(entry, destination)
      runtime.onOperationSuccess?.('copy', [{ ...entry, id: destination, fullPath: destination }])
    }),
    chmodFile: async (_sessionId: string, path: string, mode: string) => invoke('chmod', async () => {
      if (!runtime.adapter.chmod) throw new Error('Changing permissions is not supported')
      const entry = nodeForPath(path)
      await runtime.adapter.chmod(entry, mode)
      runtime.onOperationSuccess?.('chmod', [entry])
    }),
    chownFile: async () => { throw new Error('Changing ownership is not supported') },
    catFile: async () => { throw new Error('Reading files is not supported by this adapter') },
    pwd: async (_sessionId?: string) => runtime.adapter.cwd ? runtime.adapter.cwd() : runtime.initialPath,
    cd: async (_sessionId: string, path: string) => path,
    loading,
    error,
  }
}

type FileTreeCacheData = any

const memoryCache = new Map<string, FileTreeCacheData>()

export function useFileManagerCache() {
  const { sourceKey } = useFileManagerRuntime()
  const storageKey = `cyber.fileManager.cache.${sourceKey}`
  const pendingRef = useRef<FileTreeCacheData | null>(null)

  const write = (value: FileTreeCacheData) => {
    memoryCache.set(sourceKey, value)
    pendingRef.current = value
  }

  return useMemo(() => ({
    getFileTreeCache: (_key: string) => memoryCache.get(sourceKey),
    setFileTreeCache: (_key: string, value: FileTreeCacheData) => write(value),
    loadFileTreeCache: async (_key: string) => {
      const memory = memoryCache.get(sourceKey)
      if (memory) return memory
      if (typeof window === 'undefined') return undefined
      try {
        const raw = window.localStorage.getItem(storageKey)
        if (!raw) return undefined
        const value = JSON.parse(raw) as FileTreeCacheData
        memoryCache.set(sourceKey, value)
        return value
      } catch {
        return undefined
      }
    },
    flushFileTreeCache: (_key: string) => {
      if (typeof window === 'undefined') return
      const value = pendingRef.current || memoryCache.get(sourceKey)
      if (!value) return
      try { window.localStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* ignore */ }
      pendingRef.current = null
    },
  }), [sourceKey, storageKey])
}

export function isFileNotFoundError(error: unknown): boolean {
  if (!error) return false
  const message = error instanceof Error ? error.message : String(error)
  return /not found|no such file|404/i.test(message)
}

export function inferInitialRoot(initialPath: string): string {
  return inferRootPath(initialPath)
}

export function parentOf(path: string, root?: string): string {
  return parentPath(path, root || inferRootPath(path))
}
