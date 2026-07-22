const stripWrappingQuotes = (value: string): string => {
  if (value.length < 2) return value
  const first = value[0]
  const last = value[value.length - 1]
  return (first === '"' && last === '"') || (first === "'" && last === "'") ? value.slice(1, -1) : value
}

export const normalizePath = (input: string, isWindows: boolean = false): string => {
  if (!input) return input
  let value = stripWrappingQuotes(String(input)).trim().replace(/\\/g, '/')
  const hasUncPrefix = isWindows && value.startsWith('//')
  value = hasUncPrefix ? `//${value.slice(2).replace(/\/{2,}/g, '/')}` : value.replace(/\/{2,}/g, '/')
  if (isWindows) {
    const driveMatch = value.match(/^([a-zA-Z]):(\/.*)?$/)
    if (driveMatch) {
      const drive = driveMatch[1].toUpperCase()
      const rest = driveMatch[2] ?? ''
      if (!rest || rest === '/') return `${drive}:`
      return `${drive}:${rest.length > 1 && rest.endsWith('/') ? rest.slice(0, -1) : rest}`
    }
  }
  return value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value
}

export const formatPathForDisplay = (path: string, isWindows: boolean = false): string => {
  if (!isWindows || !path) return path
  const canonical = normalizePath(path, true)
  if (canonical.startsWith('//')) return `\\\\${canonical.slice(2).replace(/\//g, '\\')}`
  if (/^[A-Za-z]:$/.test(canonical)) return `${canonical.toUpperCase()}\\`
  return canonical.replace(/^([a-zA-Z]):/, (_, drive) => `${String(drive).toUpperCase()}:`).replace(/\//g, '\\')
}

export const formatFileSize = (value: unknown): string => {
  const size = typeof value === 'number' ? value : Number(value || 0)
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)))
  return `${parseFloat((size / Math.pow(1024, index)).toFixed(2))} ${units[index]}`
}

export const inferRootPath = (path: string): string => {
  const normalized = normalizePath(path, /^[A-Za-z]:|^\/\//.test(path))
  const drive = normalized.match(/^([A-Za-z]:)/)
  if (drive) return drive[1].toUpperCase()
  if (normalized.startsWith('//')) {
    const parts = normalized.split('/').filter(Boolean)
    return parts.length >= 2 ? `//${parts[0]}/${parts[1]}` : normalized
  }
  return normalized.startsWith('/') ? '/' : ''
}

export const entryPath = (directory: string, entry: { name: string; path?: string; fullPath?: string }): string => {
  if (entry.fullPath || entry.path) return entry.fullPath || entry.path || ''
  const base = directory.replace(/[\\/]+$/, '')
  return normalizePath(base === '' || base === '/' ? `/${entry.name}` : `${base}/${entry.name}`, /^[A-Za-z]:|^\/\//.test(directory))
}

export const parentPath = (path: string, root = inferRootPath(path)): string => {
  const windows = /^[A-Za-z]:|^\/\//.test(path)
  const normalized = normalizePath(path, windows)
  if (normalizePath(root, windows) === normalized) return root
  const index = normalized.lastIndexOf('/')
  if (index <= 0) return root || '/'
  const parent = normalized.slice(0, index)
  return /^[A-Za-z]:$/.test(parent) ? parent : parent || root
}

export const parseFileSize = (sizeStr?: string | number): number => {
  if (!sizeStr) return 0
  if (typeof sizeStr === 'number') return sizeStr
  const match = sizeStr.toLowerCase().match(/([\d.]+)\s*(b|kb|mb|gb|tb)?/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = (match[2] || 'b').toLowerCase()
  switch (unit) {
    case 'kb': return value * 1024
    case 'mb': return value * 1024 * 1024
    case 'gb': return value * 1024 * 1024 * 1024
    case 'tb': return value * 1024 * 1024 * 1024 * 1024
    default: return value
  }
}

export const formatTime = (timeStr?: string): string => {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    if (isNaN(date.getTime())) return ''
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const fileDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (fileDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    }
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

// Bounded LRU map utilities
export const setBoundedMapEntry = <T,>(map: Map<string, T>, key: string, value: T, maxEntries: number): void => {
  if (map.has(key)) map.delete(key)
  map.set(key, value)
  while (map.size > maxEntries) {
    const oldestKey = map.keys().next().value as string | undefined
    if (!oldestKey) break
    map.delete(oldestKey)
  }
}

export const getBoundedMapEntry = <T,>(map: Map<string, T>, key: string): T | undefined => {
  const value = map.get(key)
  if (value === undefined) return undefined
  setBoundedMapEntry(map, key, value, Number.MAX_SAFE_INTEGER)
  return value
}

export const normalizeCacheEntries = <T,>(entries: [string, T][], maxEntries: number): [string, T][] => {
  if (entries.length <= maxEntries) return entries
  return entries.slice(entries.length - maxEntries)
}

export const buildBoundedMapFromEntries = <T,>(entries: [string, T][], maxEntries: number): Map<string, T> => {
  return new Map(normalizeCacheEntries(entries, maxEntries))
}

// Constants
export const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
export const LARGE_FILE_WARNING_BYTES = 10 * 1024 * 1024
export const HUGE_FILE_WARNING_BYTES = 100 * 1024 * 1024
export const MAX_TREE_CACHE_DIRS = 120
export const MAX_ALL_FILES_CACHE_DIRS = 120
export const MAX_PERSISTED_TREE_CACHE_ENTRIES = 100
export const MAX_PERSISTED_ALL_FILES_CACHE_ENTRIES = 100
export const MAX_PERSISTED_CURRENT_DIR_FILES = 2000
export const INITIAL_VISIBLE_FILES = 300
export const VISIBLE_FILES_LOAD_STEP = 300
export const LOAD_MORE_SCROLL_THRESHOLD = 240
