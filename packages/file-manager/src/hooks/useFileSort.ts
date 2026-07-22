import { useState, useMemo, useCallback } from 'react'
import type { FileNode } from '../types'

export type FileSortKey = 'name' | 'mode' | 'size' | 'time' | 'link'
type SortDirection = 'asc' | 'desc'

// Helper function to parse file size string to number
function parseFileSize(sizeStr?: string | number): number {
  if (!sizeStr) return 0
  if (typeof sizeStr === 'number') return sizeStr

  const match = sizeStr.toLowerCase().match(/([\d.]+)\s*(b|kb|mb|gb|tb)?/i)
  if (!match) return 0

  const value = parseFloat(match[1])
  const unit = (match[2] || 'b').toLowerCase()

  switch (unit) {
    case 'kb':
      return value * 1024
    case 'mb':
      return value * 1024 * 1024
    case 'gb':
      return value * 1024 * 1024 * 1024
    case 'tb':
      return value * 1024 * 1024 * 1024 * 1024
    default:
      return value
  }
}

export function useFileSort(files: FileNode[]) {
  const [sortKey, setSortKey] = useState<FileSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = useCallback(
    (key: FileSortKey) => {
      if (sortKey === key) {
        // Toggle direction if clicking the same column
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        // New column, default to ascending
        setSortKey(key)
        setSortDirection('asc')
      }
    },
    [sortKey]
  )

  const sortedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      // Always keep directories first
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1
      }

      let comparison = 0

      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
          break
        case 'mode':
          comparison = (a.mode || '').localeCompare(b.mode || '')
          break
        case 'size': {
          const sizeA = parseFileSize(a.size)
          const sizeB = parseFileSize(b.size)
          comparison = sizeA - sizeB
          break
        }
        case 'time': {
          const timeA = a.time ? new Date(a.time).getTime() : 0
          const timeB = b.time ? new Date(b.time).getTime() : 0
          comparison = timeA - timeB
          break
        }
        case 'link':
          comparison = (a.link || '').localeCompare(b.link || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          })
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [files, sortKey, sortDirection])

  return {
    sortedFiles,
    sortKey,
    sortDirection,
    handleSort,
  }
}
