export const FILE_MANAGER_SNAPSHOT_VERSION = 1

export interface FileManagerSnapshot {
  version: typeof FILE_MANAGER_SNAPSHOT_VERSION
  savedAt: number
  currentPath: string
  expandedPaths: string[]
  viewMode: 'list' | 'grid'
  data: Record<string, unknown>
}

export interface FileManagerCacheAdapter {
  load(scopeKey: string): Promise<FileManagerSnapshot | null>
  save(scopeKey: string, snapshot: FileManagerSnapshot): Promise<void>
  remove(scopeKey: string): Promise<void>
  flush?(scopeKey: string): Promise<void>
}

function cloneSnapshot(snapshot: FileManagerSnapshot): FileManagerSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as FileManagerSnapshot
}

function isSnapshot(value: unknown): value is FileManagerSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<FileManagerSnapshot>
  return snapshot.version === FILE_MANAGER_SNAPSHOT_VERSION &&
    typeof snapshot.savedAt === 'number' &&
    typeof snapshot.currentPath === 'string' &&
    Array.isArray(snapshot.expandedPaths) &&
    (snapshot.viewMode === 'list' || snapshot.viewMode === 'grid') &&
    !!snapshot.data &&
    typeof snapshot.data === 'object'
}

export function createMemoryFileManagerCache(): FileManagerCacheAdapter {
  const snapshots = new Map<string, FileManagerSnapshot>()

  return {
    async load(scopeKey) {
      const snapshot = snapshots.get(scopeKey)
      return snapshot ? cloneSnapshot(snapshot) : null
    },
    async save(scopeKey, snapshot) {
      snapshots.set(scopeKey, cloneSnapshot(snapshot))
    },
    async remove(scopeKey) {
      snapshots.delete(scopeKey)
    },
  }
}

export function createLocalStorageFileManagerCache(options?: {
  storage?: Storage
  keyPrefix?: string
}): FileManagerCacheAdapter {
  const storage = options?.storage ?? window.localStorage
  const keyPrefix = options?.keyPrefix ?? 'cyber.fileManager.snapshot'
  const keyFor = (scopeKey: string) => `${keyPrefix}.${encodeURIComponent(scopeKey)}`

  return {
    async load(scopeKey) {
      try {
        const raw = storage.getItem(keyFor(scopeKey))
        if (!raw) return null
        const value = JSON.parse(raw) as unknown
        if (!isSnapshot(value)) return null
        return value
      } catch {
        return null
      }
    },
    async save(scopeKey, snapshot) {
      storage.setItem(keyFor(scopeKey), JSON.stringify(snapshot))
    },
    async remove(scopeKey) {
      storage.removeItem(keyFor(scopeKey))
    },
  }
}
