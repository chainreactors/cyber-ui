"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useTranslations } from "../runtime"
import { useToast } from "../ui"
import { useIsMobile } from "../ui"
import { TreeApi, NodeApi } from "react-arborist"
import { useFileSystem, isFileNotFoundError, useFileManagerCache } from "../runtime"
import type { FileNode, SelectionState, UploadQueueState, DownloadQueueState } from "../types"
import {
  normalizePath, formatPathForDisplay, parseFileSize,
  setBoundedMapEntry, getBoundedMapEntry,
  MAX_TREE_CACHE_DIRS, MAX_ALL_FILES_CACHE_DIRS,
  INITIAL_VISIBLE_FILES, VISIBLE_FILES_LOAD_STEP,
  LOAD_MORE_SCROLL_THRESHOLD,
  CACHE_TTL_MS,
} from "../utils/file-manager-utils"
import { useFileSort } from "./useFileSort"
import { useResizeObserver } from "./useResizeObserver"
import React from "react"

export function useFileManagerState(sessionId: string, session: any) {
  const t = useTranslations('Sessions.fileManagement')
  const { toast } = useToast()

  // File system hooks
  const {
    listFiles,
    enumDriversFromAPI,
    mkdir,
    touchFile,
    uploadFile,
    downloadFile,
    catFile,
    rmFile,
    mvFile,
    cpFile,
    chmodFile,
    chownFile,
    pwd,
    cd,
    loading: rpcLoading,
    error: rpcError
  } = useFileSystem()

  // Global cache for session persistence
  const { getFileTreeCache, setFileTreeCache, loadFileTreeCache, flushFileTreeCache } = useFileManagerCache()
  const [shouldUpdateCache, setShouldUpdateCache] = useState(false)
  const triggerCacheUpdate = useCallback(() => setShouldUpdateCache(true), [])

  // Refs
  const treeRef = useRef<TreeApi<FileNode>>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isNavigatingRef = useRef(false)

  // Tree state
  const [treeData, setTreeData] = useState<FileNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set())

  // Selection state
  const [selection, setSelection] = useState<SelectionState>({
    selectedIds: new Set(),
    lastSelectedId: null,
    selectRange: false
  })

  // Navigation state
  const [currentPath, setCurrentPath] = useState<string>('/')
  const [pathInputValue, setPathInputValue] = useState<string>('/')
  const [isEditingPath, setIsEditingPath] = useState(false)

  // Operation states
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [enumeratingDrivers, setEnumeratingDrivers] = useState(false)
  const [operatingFiles, setOperatingFiles] = useState<Set<string>>(new Set())
  // Dialog operation states
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [creatingFile, setCreatingFile] = useState(false)
  const [renaming, setRenaming] = useState(false)

  // Dialog states
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreateFile, setShowCreateFile] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; path: string } | null>(null)
  const [newName, setNewName] = useState('')
  // Upload dialog states
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null)
  const [uploadTargetPath, setUploadTargetPath] = useState<string>('')
  // Context menu target path (for directory operations)
  const [contextMenuTargetPath, setContextMenuTargetPath] = useState<string | null>(null)

  // Preview state
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)

  // File size warning dialog
  const [fileSizeWarning, setFileSizeWarning] = useState<{ file: FileNode; sizeInBytes: number } | null>(null)

  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Current directory files for middle panel
  const [currentDirFiles, setCurrentDirFiles] = useState<FileNode[]>([])
  const [currentDirPath, setCurrentDirPath] = useState<string>('')
  const [visibleFileCount, setVisibleFileCount] = useState(INITIAL_VISIBLE_FILES)

  // New states for P0/P2 features
  const [uploadQueue, setUploadQueue] = useState<UploadQueueState>({
    files: [],
    progresses: new Map(),
    currentIndex: 0,
    totalFiles: 0,
  })
  const [showUploadProgress, setShowUploadProgress] = useState(false)
  const [downloadQueue, setDownloadQueue] = useState<DownloadQueueState>({
    progresses: new Map(),
    totalFiles: 0,
  })
  const [showDownloadProgress, setShowDownloadProgress] = useState(false)
  const [showProperties, setShowProperties] = useState(false)
  const [selectedPropertyFile, setSelectedPropertyFile] = useState<FileNode | null>(null)
  const [showPermissionEditor, setShowPermissionEditor] = useState(false)
  const [selectedPermissionFile, setSelectedPermissionFile] = useState<FileNode | null>(null)

  // Tree search states (Phase 1)
  const [treeSearchQuery, setTreeSearchQuery] = useState('')
  const [matchedNodeIds, setMatchedNodeIds] = useState<Set<string>>(new Set())
  const [matchedCount, setMatchedCount] = useState(0)

  // Resize observer for tree container
  const { ref: treeContainerRef, width: treeWidth, height: treeHeight } = useResizeObserver()

  // Responsive hook
  const isMobile = useIsMobile()

  // System detection based on session
  const isWindowsSession = useMemo(() => {
    if (!session) return false
    const sessionOS = session?.os?.name?.toLowerCase() || session?.type?.toLowerCase() || ''
    return sessionOS.includes('windows') || sessionOS.includes('win32') || sessionOS.includes('winnt')
  }, [session])

  // File sorting hook
  const { sortedFiles, sortKey, sortDirection, handleSort } = useFileSort(currentDirFiles)
  const visibleFiles = useMemo(
    () => sortedFiles.slice(0, visibleFileCount),
    [sortedFiles, visibleFileCount]
  )
  const hasMoreVisibleFiles = visibleFileCount < sortedFiles.length

  useEffect(() => {
    setVisibleFileCount(Math.min(INITIAL_VISIBLE_FILES, sortedFiles.length))
  }, [currentDirPath, viewMode, sortedFiles.length])

  const handleFileListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreVisibleFiles) return
    const target = event.currentTarget
    const remainingScroll = target.scrollHeight - target.scrollTop - target.clientHeight
    if (remainingScroll > LOAD_MORE_SCROLL_THRESHOLD) return

    setVisibleFileCount((prev) => {
      if (prev >= sortedFiles.length) return prev
      return Math.min(prev + VISIBLE_FILES_LOAD_STEP, sortedFiles.length)
    })
  }, [hasMoreVisibleFiles, sortedFiles.length])


  // Cache for file listings (directories only, for tree)
  const fileCache = useRef<Map<string, FileNode[]>>(new Map())
  // Cache for all files (directories + files, for middle panel)
  const allFilesCache = useRef<Map<string, FileNode[]>>(new Map())
  // Timestamps for cache entries (TTL tracking)
  const cacheTimestamps = useRef<Map<string, number>>(new Map())

  // Cache mode: 'cached' uses memory cache with TTL, 'live' always fetches from server
  const CACHE_MODE_KEY = 'iom.fileManager.cacheMode'
  const [cacheMode, setCacheMode] = useState<'cached' | 'live'>(() => {
    if (typeof window === 'undefined') return 'cached'
    try {
      const stored = window.localStorage.getItem(CACHE_MODE_KEY)
      return stored === 'live' ? 'live' : 'cached'
    } catch {
      return 'cached'
    }
  })

  // Persist cache mode preference
  useEffect(() => {
    try {
      window.localStorage.setItem(CACHE_MODE_KEY, cacheMode)
    } catch { /* ignore */ }
  }, [cacheMode])

  const isAbsoluteFileNodePath = useCallback((path: string): boolean => {
    if (isWindowsSession) {
      return /^[A-Za-z]:(?:\/|$)/.test(path) || path.startsWith('//')
    }
    return path.startsWith('/')
  }, [isWindowsSession])

  const joinFileNodePath = useCallback((parentPath: string, childName: string): string => {
    const parent = normalizePath(parentPath, isWindowsSession)
    const child = childName.replace(/^[\\/]+/, '')
    if (!child) return parent
    if (isWindowsSession) {
      return normalizePath(parent.endsWith('/') ? `${parent}${child}` : `${parent}/${child}`, true)
    }
    return normalizePath(parent === '/' ? `/${child}` : `${parent}/${child}`, false)
  }, [isWindowsSession])

  const getFileNodeName = useCallback((path: string): string => {
    if (path === '/') return '/'
    const normalized = normalizePath(path, isWindowsSession)
    const parts = normalized.replace(/[\\/]+$/, '').split(/[\\/]/).filter(Boolean)
    return parts[parts.length - 1] || normalized
  }, [isWindowsSession])

  const getCanonicalFileNodePath = useCallback((node: FileNode, parentPath?: string): string => {
    const rawPath = (node.fullPath || node.id || '').trim()
    const rawName = (node.name || '').trim()

    if (rawPath) {
      const normalizedRawPath = normalizePath(rawPath, isWindowsSession)
      if (isAbsoluteFileNodePath(normalizedRawPath) || normalizedRawPath === '/') {
        return normalizedRawPath
      }
      if (parentPath) {
        return joinFileNodePath(parentPath, rawName || normalizedRawPath)
      }
      if (!isWindowsSession) {
        return normalizePath(`/${normalizedRawPath}`, false)
      }
      return normalizedRawPath
    }

    if (rawName && parentPath) {
      return joinFileNodePath(parentPath, rawName)
    }

    if (rawName && !isWindowsSession) {
      return normalizePath(`/${rawName}`, false)
    }

    return rawName ? normalizePath(rawName, isWindowsSession) : ''
  }, [getFileNodeName, isAbsoluteFileNodePath, isWindowsSession, joinFileNodePath])

  const dedupeFileNodes = useCallback((nodes: FileNode[], parentPath?: string): FileNode[] => {
    const seen = new Map<string, FileNode>()

    for (const node of nodes) {
      const key = getCanonicalFileNodePath(node, parentPath)
      if (!key) continue

      const name = node.name?.trim() ? node.name : getFileNodeName(key)

      const normalizedNode = {
        ...node,
        id: key,
        name,
        fullPath: key,
        children: node.children ? dedupeFileNodes(node.children, key) : node.children
      }
      const existing = seen.get(key)

      if (!existing) {
        seen.set(key, normalizedNode)
        continue
      }

      seen.set(key, {
        ...existing,
        ...normalizedNode,
        children: normalizedNode.children !== undefined ? normalizedNode.children : existing.children,
        isLazy: normalizedNode.isLazy ?? existing.isLazy
      })
    }

    return Array.from(seen.values())
  }, [getCanonicalFileNodePath, getFileNodeName])

  // Unified tree update API - updates a specific node's children by node ID
  const updateTreeNode = useCallback((nodeId: string, children: FileNode[]) => {
    setTreeData(prevData => {
      const normalizeForComparison = (path: string) => normalizePath(path, isWindowsSession)
      const normalizedTargetId = normalizeForComparison(nodeId)

      const updateNode = (nodes: FileNode[]): FileNode[] => {
        return dedupeFileNodes(nodes.map(n => {
          const normalizedNId = normalizeForComparison(n.id)

          if (normalizedNId === normalizedTargetId) {
            const dedupedChildren = dedupeFileNodes(children, normalizedNId)
            return { ...n, children: dedupedChildren, isLazy: false }
          }
          if (n.children && n.children.length > 0) {
            return { ...n, children: updateNode(n.children) }
          }
          return n
        }))
      }
      return updateNode(prevData)
    })
  }, [dedupeFileNodes, isWindowsSession])

  // Unified tree replacement API - replaces entire tree
  const replaceTree = useCallback((newTree: FileNode[]) => {
    setTreeData(dedupeFileNodes(newTree))
  }, [dedupeFileNodes])

  // Determine if file is viewable as text
  const isViewableFile = useCallback((node: FileNode): boolean => {
    if (node.isDirectory) return false
    const size = parseFileSize(node.size)
    const MAX_TEXT_SIZE = 1024 * 1024 // 1MB

    const textExtensions = ['.txt', '.js', '.ts', '.jsx', '.tsx', '.json', '.xml', '.html', '.css', '.md', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.r', '.sql', '.sh', '.bat', '.ps1', '.yaml', '.yml', '.ini', '.cfg', '.conf', '.log', '.env', '.gitignore', '.dockerfile']
    const extension = node.name.toLowerCase().substring(node.name.lastIndexOf('.'))

    return size < MAX_TEXT_SIZE && (textExtensions.includes(extension) || !extension)
  }, [])

  // Load all files (including both directories and files) for middle panel
  const loadAllFiles = useCallback(async (
    path: string,
    forceFresh: boolean = false,
    throwOnNotFound: boolean = false
  ): Promise<FileNode[]> => {
    const normalizedPath = normalizePath(path, isWindowsSession)

    if (!forceFresh && cacheMode === 'cached' && allFilesCache.current.has(normalizedPath)) {
      const tsKey = `all:${normalizedPath}`
      const ts = cacheTimestamps.current.get(tsKey)
      if (ts && (Date.now() - ts) < CACHE_TTL_MS) {
        const cached = getBoundedMapEntry(allFilesCache.current, normalizedPath)
        if (cached) return cached
      } else {
        // TTL expired, remove stale entry
        allFilesCache.current.delete(normalizedPath)
        cacheTimestamps.current.delete(tsKey)
      }
    }

    try {
      const files = await listFiles(sessionId, normalizedPath)

      files.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      const fileNodes: FileNode[] = dedupeFileNodes(files.map(file => ({
        id: normalizePath(file.fullPath || `${normalizedPath}/${file.name}`, isWindowsSession),
        name: file.name,
        isDirectory: file.isDirectory ?? false,
        fullPath: file.fullPath ? normalizePath(file.fullPath, isWindowsSession) : undefined,
        isLazy: file.isDirectory,
        children: file.isDirectory ? [] : [],
        size: file.size,
        mode: file.mode,
        time: file.time
      })))

      setBoundedMapEntry(allFilesCache.current, normalizedPath, fileNodes, MAX_ALL_FILES_CACHE_DIRS)
      cacheTimestamps.current.set(`all:${normalizedPath}`, Date.now())
      return fileNodes
    } catch (err: unknown) {
      if (isFileNotFoundError(err)) {
        if (throwOnNotFound) throw err
        console.warn(`Path not found (silent): ${normalizedPath}`)
        return []
      }
      console.error(`Failed to load all files from ${normalizedPath}:`, err)
      throw err
    }
  }, [sessionId, listFiles, isWindowsSession, cacheMode, dedupeFileNodes])

  const loadPath = useCallback(async (
    path: string,
    forceFresh: boolean = false,
    throwOnNotFound: boolean = false
  ): Promise<FileNode[]> => {
    const normalizedPath = normalizePath(path, isWindowsSession)

    if (!forceFresh && cacheMode === 'cached' && fileCache.current.has(normalizedPath)) {
      const tsKey = `tree:${normalizedPath}`
      const ts = cacheTimestamps.current.get(tsKey)
      if (ts && (Date.now() - ts) < CACHE_TTL_MS) {
        const cached = getBoundedMapEntry(fileCache.current, normalizedPath)
        if (cached) return cached
      } else {
        // TTL expired, remove stale entry
        fileCache.current.delete(normalizedPath)
        cacheTimestamps.current.delete(tsKey)
      }
    }

    try {
      setLoadingNodes(prev => new Set(prev).add(normalizedPath))
      const files = await listFiles(sessionId, normalizedPath)

      files.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      const fileNodes: FileNode[] = dedupeFileNodes(files
        .map(file => ({
          id: normalizePath(file.fullPath || `${normalizedPath}/${file.name}`, isWindowsSession),
          name: file.name,
          isDirectory: file.isDirectory ?? false,
          fullPath: file.fullPath ? normalizePath(file.fullPath, isWindowsSession) : undefined,
          isLazy: file.isDirectory,
          children: file.isDirectory ? [] : undefined,
          size: file.size,
          mode: file.mode,
          time: file.time
        })))

      setBoundedMapEntry(fileCache.current, normalizedPath, fileNodes, MAX_TREE_CACHE_DIRS)
      cacheTimestamps.current.set(`tree:${normalizedPath}`, Date.now())
      return fileNodes
    } catch (err: unknown) {
      if (isFileNotFoundError(err)) {
        if (throwOnNotFound) throw err
        console.warn(`Path not found (silent): ${normalizedPath}`)
        return []
      }
      console.error(`Failed to load path ${normalizedPath}:`, err)
      throw err
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev)
        newSet.delete(normalizedPath)
        return newSet
      })
    }
  }, [sessionId, listFiles, isWindowsSession, cacheMode, dedupeFileNodes])

  // Build tree from root to target path
  const buildTreeFromPath = useCallback(async (targetPath: string, isInitialLoad: boolean = false) => {
    const normalizedTarget = normalizePath(targetPath, isWindowsSession)
    const pathParts = normalizedTarget.split('/').filter(p => p.trim())

    if (pathParts.length === 0) {
      const files = await loadPath(normalizedTarget)
      const rootNode: FileNode = {
        id: normalizedTarget,
        name: normalizedTarget,
        fullPath: normalizedTarget,
        isDirectory: true,
        isLazy: false,
        children: files
      }

      if (isInitialLoad || !isWindowsSession) {
        replaceTree([rootNode])
      } else {
        setTreeData(prevData => {
          if (prevData.length === 0) {
            return dedupeFileNodes([rootNode])
          }

          const existingRootIndex = prevData.findIndex(n =>
            normalizePath(n.id, isWindowsSession) === normalizePath(rootNode.id, isWindowsSession)
          )
          if (existingRootIndex === -1) {
            return dedupeFileNodes([...prevData, rootNode])
          }

          const newData = [...prevData]
          newData[existingRootIndex] = rootNode
          return dedupeFileNodes(newData)
        })
      }
      setExpandedNodes(new Set([normalizedTarget]))
      const allFiles = await loadAllFiles(normalizedTarget)
      setCurrentDirFiles(allFiles)
      setCurrentDirPath(normalizedTarget)
      return
    }

    const normalizeForComparison = (path: string) => normalizePath(path, isWindowsSession)

    let rootPath: string
    let rootName: string
    let startIndex: number

    if (isWindowsSession) {
      const driveLetter = pathParts[0].replace(':', '')
      rootPath = `${driveLetter}:`
      rootName = rootPath
      startIndex = 1
    } else {
      if (normalizedTarget.startsWith('/')) {
        rootPath = '/'
        rootName = '/'
        startIndex = 0
      } else {
        rootPath = pathParts[0]
        rootName = pathParts[0]
        startIndex = 1
      }
    }

    const expandedIds = new Set<string>([rootPath])

    const buildPathNodes = (index: number): FileNode[] => {
      if (index >= pathParts.length) return []

      const currentPathStr = isWindowsSession
        ? pathParts.slice(0, index + 1).join('/')
        : (normalizedTarget.startsWith('/') ? '/' : '') + pathParts.slice(0, index + 1).join('/')

      expandedIds.add(currentPathStr)

      return [{
        id: currentPathStr,
        name: pathParts[index],
        fullPath: currentPathStr,
        isDirectory: true,
        isLazy: true,
        children: buildPathNodes(index + 1)
      }]
    }

    const rootNode: FileNode = {
      id: rootPath,
      name: rootName,
      fullPath: rootPath,
      isDirectory: true,
      isLazy: true,
      children: pathParts.length > startIndex ? buildPathNodes(startIndex) : []
    }

    setExpandedNodes(expandedIds)

    try {
      const targetFiles = await loadPath(normalizedTarget)

      const updateNode = (node: FileNode): FileNode => {
        if (normalizeForComparison(node.id) === normalizeForComparison(normalizedTarget)) {
          return {
            ...node,
            isLazy: false,
            children: targetFiles
          }
        }
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: node.children.map(updateNode)
          }
        }
        return node
      }

      const updatedRootNode = updateNode(rootNode)

      const allFiles = await loadAllFiles(normalizedTarget)
      setCurrentDirFiles(allFiles)
      setCurrentDirPath(normalizedTarget)

      if (isInitialLoad) {
        replaceTree([updatedRootNode])
      } else {
        setTreeData(prevData => {
          if (prevData.length === 0) {
            return dedupeFileNodes([updatedRootNode])
          }

          const existingRootIndex = prevData.findIndex(n =>
            normalizeForComparison(n.id) === normalizeForComparison(updatedRootNode.id)
          )

          if (existingRootIndex !== -1) {
            const mergeNodes = (existing: FileNode, updated: FileNode): FileNode => {
              const existingChildren = existing.children || []
              const updatedChildren = updated.children || []
              const mergedChildren = [...existingChildren]

              updatedChildren.forEach(newChild => {
                const exists = mergedChildren.some(c =>
                  normalizeForComparison(c.id) === normalizeForComparison(newChild.id)
                )
                if (!exists) {
                  mergedChildren.push(newChild)
                } else {
                  const existingChildIndex = mergedChildren.findIndex(c =>
                    normalizeForComparison(c.id) === normalizeForComparison(newChild.id)
                  )
                  if (existingChildIndex >= 0) {
                    mergedChildren[existingChildIndex] = mergeNodes(mergedChildren[existingChildIndex], newChild)
                  }
                }
              })

              return {
                ...existing,
                ...updated,
                children: mergedChildren,
                isLazy: updated.isLazy ?? existing.isLazy
              }
            }

            const newData = [...prevData]
            newData[existingRootIndex] = mergeNodes(prevData[existingRootIndex], updatedRootNode)
            return dedupeFileNodes(newData)
          } else {
            return dedupeFileNodes([...prevData, updatedRootNode])
          }
        })
      }
    } catch (err) {
      console.error(`Failed to load target path ${normalizedTarget}:`, err)

      if (isInitialLoad) {
        replaceTree([rootNode])
      } else {
        setTreeData(prevData => {
          if (prevData.length === 0) {
            return dedupeFileNodes([rootNode])
          }

          const existingRootIndex = prevData.findIndex(n =>
            normalizeForComparison(n.id) === normalizeForComparison(rootNode.id)
          )

          if (existingRootIndex !== -1) {
            const newData = [...prevData]
            newData[existingRootIndex] = rootNode
            return dedupeFileNodes(newData)
          } else {
            return dedupeFileNodes([...prevData, rootNode])
          }
        })
      }
    }

  }, [loadPath, isWindowsSession, replaceTree, loadAllFiles])

  // Initialize file system
  const initializeFileSystem = useCallback(async () => {
    try {
      let workdir = session?.workdir

      if (!workdir) {
        workdir = await pwd(sessionId)
      }

      if (!workdir) {
        throw new Error('Cannot get current working directory from session')
      }

      const normalizedPath = normalizePath(workdir, isWindowsSession)
      setCurrentPath(normalizedPath)
      setPathInputValue(formatPathForDisplay(normalizedPath, isWindowsSession))

      await buildTreeFromPath(normalizedPath, true)

      triggerCacheUpdate()
    } catch (err) {
      console.error('Failed to initialize file system:', err)
      toast({
        variant: "destructive",
        title: t('loadError'),
        description: err instanceof Error ? err.message : t('unknownError')
      })
    }
  }, [sessionId, session, pwd, isWindowsSession, buildTreeFromPath, toast, t, triggerCacheUpdate])

  // Refresh file system with loading state and toast
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // Clear all in-memory caches to force fresh data
      fileCache.current.clear()
      allFilesCache.current.clear()
      cacheTimestamps.current.clear()

      await initializeFileSystem()
      toast({
        title: t('refreshSuccess'),
        description: t('refreshSuccessDesc')
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: t('refreshFailed'),
        description: err instanceof Error ? err.message : t('unknownError')
      })
    } finally {
      setRefreshing(false)
    }
  }, [initializeFileSystem, toast, t])

  const handleNodeSelect = useCallback(async (nodes: NodeApi<FileNode>[], event?: React.MouseEvent) => {
    if (nodes.length === 0) return

    if (isNavigatingRef.current) {
      return
    }

    // Skip programmatic selection changes (e.g. from file list click updating the
    // shared selection state). Only process actual user clicks in the tree.
    if (!event) return

    const node = nodes[0]
    const nodeId = node.data.id
    const isSelected = selection.selectedIds.has(nodeId)
    const isRangeSelect = event?.shiftKey || false
    const isMultiSelect = event?.ctrlKey || event?.metaKey || false

    if (node.data.isDirectory) {
      setSelection({
        selectedIds: new Set([nodeId]),
        lastSelectedId: nodeId,
        selectRange: false
      })
      const directoryPath = normalizePath(node.data.fullPath || nodeId, isWindowsSession)
      try {
        const files = await loadAllFiles(directoryPath)
        setCurrentDirFiles(files)
        setCurrentDirPath(directoryPath)
        setCurrentPath(directoryPath)
        setPathInputValue(formatPathForDisplay(directoryPath, isWindowsSession))
      } catch (error: unknown) {
        if (!isFileNotFoundError(error)) {
          console.error('Failed to load directory files:', error)
          toast({
            variant: "destructive",
            title: t('navigationFailed'),
            description: error instanceof Error ? error.message : t('unknownError')
          })
        }
      }
      return
    }

    setSelection(prev => {
      let newSelectedIds = new Set(prev.selectedIds)

      if (isRangeSelect && prev.lastSelectedId) {
        const tree = treeRef.current
        if (tree) {
          const startIndex = tree.visibleNodes.findIndex(n => n.data.id === prev.lastSelectedId)
          const endIndex = tree.visibleNodes.findIndex(n => n.data.id === nodeId)

          if (startIndex !== -1 && endIndex !== -1) {
            const min = Math.min(startIndex, endIndex)
            const max = Math.max(startIndex, endIndex)

            for (let i = min; i <= max; i++) {
              const visibleNode = tree.visibleNodes[i]
              if (visibleNode && !visibleNode.data.isDirectory) {
                newSelectedIds.add(visibleNode.data.id)
              }
            }
          }
        }
      } else if (isMultiSelect) {
        if (isSelected) {
          newSelectedIds.delete(nodeId)
        } else {
          newSelectedIds.add(nodeId)
        }
      } else {
        newSelectedIds.clear()
        newSelectedIds.add(nodeId)
      }

      return {
        selectedIds: newSelectedIds,
        lastSelectedId: nodeId,
        selectRange: isRangeSelect
      }
    })
  }, [selection.selectedIds, selection.lastSelectedId, loadAllFiles, isWindowsSession, toast, t])

  const handleCheckboxToggle = useCallback((node: NodeApi<FileNode>) => {
    const nodeId = node.data.id
    setSelection(prev => {
      const newSelectedIds = new Set(prev.selectedIds)
      if (newSelectedIds.has(nodeId)) {
        newSelectedIds.delete(nodeId)
      } else {
        newSelectedIds.add(nodeId)
      }

      return {
        selectedIds: newSelectedIds,
        lastSelectedId: nodeId,
        selectRange: false
      }
    })
  }, [])

  // Handle clicks in the file list/grid view (right panel).
  // Supports single click, Ctrl+click (toggle), Shift+click (range).
  const handleFileListSelect = useCallback((fileId: string, event: React.MouseEvent) => {
    const isRangeSelect = event.shiftKey
    const isMultiSelect = event.ctrlKey || event.metaKey

    setSelection(prev => {
      let newSelectedIds = new Set(prev.selectedIds)

      if (isRangeSelect && prev.lastSelectedId) {
        // Range select using visibleFiles order
        const startIndex = visibleFiles.findIndex(f => f.id === prev.lastSelectedId)
        const endIndex = visibleFiles.findIndex(f => f.id === fileId)

        if (startIndex !== -1 && endIndex !== -1) {
          const min = Math.min(startIndex, endIndex)
          const max = Math.max(startIndex, endIndex)
          for (let i = min; i <= max; i++) {
            newSelectedIds.add(visibleFiles[i].id)
          }
        }
      } else if (isMultiSelect) {
        if (newSelectedIds.has(fileId)) {
          newSelectedIds.delete(fileId)
        } else {
          newSelectedIds.add(fileId)
        }
      } else {
        newSelectedIds = new Set([fileId])
      }

      return {
        selectedIds: newSelectedIds,
        lastSelectedId: fileId,
        selectRange: isRangeSelect,
      }
    })
  }, [visibleFiles])

  // Refresh directory - clear cache and reload
  const handleRefreshDirectory = useCallback(async (node: NodeApi<FileNode>) => {
    if (!node.data.isDirectory) return

    const rawPath = node.data.fullPath || node.data.id
    const normalizedPath = normalizePath(rawPath, isWindowsSession)

    const expandedDescendants = Array.from(expandedNodes)
      .map(id => ({
        id,
        normalized: normalizePath(id, isWindowsSession)
      }))
      .filter(item =>
        item.normalized !== normalizedPath && item.normalized.startsWith(`${normalizedPath}/`)
      )
      .sort((a, b) => a.normalized.length - b.normalized.length)

    for (const key of Array.from(fileCache.current.keys())) {
      const normalizedKey = normalizePath(key, isWindowsSession)
      if (normalizedKey === normalizedPath || normalizedKey.startsWith(`${normalizedPath}/`)) {
        fileCache.current.delete(key)
        cacheTimestamps.current.delete(`tree:${normalizedKey}`)
      }
    }
    for (const key of Array.from(allFilesCache.current.keys())) {
      const normalizedKey = normalizePath(key, isWindowsSession)
      if (normalizedKey === normalizedPath || normalizedKey.startsWith(`${normalizedPath}/`)) {
        allFilesCache.current.delete(key)
        cacheTimestamps.current.delete(`all:${normalizedKey}`)
      }
    }

    try {
      const children = await loadPath(normalizedPath, true)
      const descendantResults: Array<{ id: string; children: FileNode[] }> = []

      for (const descendant of expandedDescendants) {
        descendantResults.push({
          id: descendant.id,
          children: await loadPath(descendant.normalized, true)
        })
      }

      const shouldRefreshCurrentDir = normalizePath(currentDirPath, isWindowsSession) === normalizedPath ||
        normalizePath(currentDirPath, isWindowsSession).startsWith(`${normalizedPath}/`)
      const allFiles = shouldRefreshCurrentDir ? await loadAllFiles(currentDirPath, true) : null

      updateTreeNode(node.data.id, children)
      for (const descendant of descendantResults) {
        updateTreeNode(descendant.id, descendant.children)
      }
      if (allFiles) {
        setCurrentDirFiles(allFiles)
      }

      toast({
        title: t('refreshSuccess'),
        description: t('refreshSuccessDesc')
      })

      triggerCacheUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('refreshFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    }
  }, [expandedNodes, isWindowsSession, loadPath, loadAllFiles, updateTreeNode, currentDirPath, setCurrentDirFiles, toast, t, triggerCacheUpdate])

  // Handle node toggle for react-arborist (string ID parameter)
  const handleTreeToggle = useCallback(async (id: string) => {
    const node = treeRef.current?.get(id)
    if (!node || !node.data.isDirectory) return

    const nodeId = node.data.id
    const isExpanded = node.isOpen

    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (isExpanded) {
        newSet.add(nodeId)
      } else {
        newSet.delete(nodeId)
      }
      return newSet
    })

    if (isExpanded && node.data.children?.length === 0) {
      const pathToLoad = node.data.fullPath || nodeId
      const normalizedPathToLoad = normalizePath(pathToLoad, isWindowsSession)
      const hadCache = fileCache.current.has(normalizedPathToLoad)

      try {
        const children = await loadPath(pathToLoad)
        if (children.length > 0 || hadCache) {
          updateTreeNode(nodeId, children)
        }
      } catch (err: unknown) {
        if (!isFileNotFoundError(err)) {
          console.error(`Failed to toggle node ${nodeId}:`, err)
        }
      }
    }

    triggerCacheUpdate()
  }, [loadPath, updateTreeNode, isWindowsSession, triggerCacheUpdate])

  // Navigate to path
  const navigateToPath = useCallback(async (path: string) => {
    if (!path || !path.trim()) return

    isNavigatingRef.current = true

    const normalizedPath = normalizePath(path, isWindowsSession)
    const displayPath = formatPathForDisplay(normalizedPath, isWindowsSession)
    const previousPath = currentPath
    const previousDisplayPath = formatPathForDisplay(previousPath, isWindowsSession)

    try {
      const pathParts = normalizedPath.split('/').filter(p => p.trim())

      if (pathParts.length === 0) {
        const files = await loadPath(normalizedPath, true, true)
        const allFiles = await loadAllFiles(normalizedPath, true, true)
        const rootNode: FileNode = {
          id: normalizedPath,
          name: normalizedPath,
          fullPath: normalizedPath,
          isDirectory: true,
          isLazy: false,
          children: files
        }

        if (!isWindowsSession) {
          replaceTree([rootNode])
        } else {
          setTreeData(prevData => {
            if (prevData.length === 0) {
              return dedupeFileNodes([rootNode])
            }

            const existingRootIndex = prevData.findIndex(n =>
              normalizePath(n.id, isWindowsSession) === normalizePath(rootNode.id, isWindowsSession)
            )
            if (existingRootIndex === -1) {
              return dedupeFileNodes([...prevData, rootNode])
            }

            const newData = [...prevData]
            newData[existingRootIndex] = rootNode
            return dedupeFileNodes(newData)
          })
        }
        setExpandedNodes(new Set([normalizedPath]))
        setCurrentDirFiles(allFiles)
        setCurrentDirPath(normalizedPath)
        setCurrentPath(normalizedPath)
        setPathInputValue(displayPath)
        return
      }

      let rootPath: string
      let startIndex: number

      if (isWindowsSession) {
        const driveLetter = pathParts[0].replace(':', '')
        rootPath = `${driveLetter}:`
        startIndex = 1
      } else {
        if (normalizedPath.startsWith('/')) {
          rootPath = '/'
          startIndex = 0
        } else {
          rootPath = pathParts[0]
          startIndex = 1
        }
      }

      const pathsToEnsure: string[] = [rootPath]
      for (let i = startIndex; i < pathParts.length; i++) {
        const p = isWindowsSession
          ? pathParts.slice(0, i + 1).join('/')
          : (normalizedPath.startsWith('/') ? '/' : '') + pathParts.slice(0, i + 1).join('/')
        pathsToEnsure.push(p)
      }

      const ensurePathExists = (nodes: FileNode[], pathIndex: number): FileNode[] => {
        if (pathIndex >= pathsToEnsure.length) return nodes

        const targetPathStr = pathsToEnsure[pathIndex]
        const normalizedTarget = normalizePath(targetPathStr, isWindowsSession)

        const existingNode = nodes.find(n =>
          normalizePath(n.id, isWindowsSession) === normalizedTarget
        )

        if (existingNode) {
          return nodes.map(n => {
            if (normalizePath(n.id, isWindowsSession) === normalizedTarget) {
              return {
                ...n,
                children: n.children ? ensurePathExists(n.children, pathIndex + 1) : []
              }
            }
            return n
          })
        } else {
          const pathName = pathIndex === 0
            ? (isWindowsSession ? `${pathParts[0]}` : rootPath)
            : pathParts[pathIndex]

          const newNode: FileNode = {
            id: targetPathStr,
            name: pathName,
            fullPath: targetPathStr,
            isDirectory: true,
            isLazy: true,
            children: pathIndex + 1 < pathsToEnsure.length
              ? ensurePathExists([], pathIndex + 1)
              : []
          }

          return [...nodes, newNode]
        }
      }

      const targetFiles = await loadPath(normalizedPath, true, true)
      const allFiles = await loadAllFiles(normalizedPath, true, true)

      setTreeData(prevData => {
        if (prevData.length === 0) {
          return dedupeFileNodes(ensurePathExists([], 0))
        } else {
          return dedupeFileNodes(ensurePathExists(prevData, 0))
        }
      })

      const expandedIds = new Set(pathsToEnsure)
      setExpandedNodes(expandedIds)

      updateTreeNode(normalizedPath, targetFiles)

      React.startTransition(() => {
        setCurrentDirFiles(allFiles)
        setCurrentDirPath(normalizedPath)
        setCurrentPath(normalizedPath)
        setPathInputValue(displayPath)
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      requestAnimationFrame(() => {
        setTimeout(() => {
          pathsToEnsure.forEach(id => {
            const node = treeRef.current?.get(id)
            if (node) {
              if (!node.isOpen) {
                node.open()
              }
              if (id === normalizedPath) {
                node.select()
              }
            }
          })
        }, 100)
      })

      setSelection({ selectedIds: new Set(), lastSelectedId: null, selectRange: false })
      setSelectedFile(null)

      await new Promise(resolve => setTimeout(resolve, 0))

      triggerCacheUpdate()

      toast({
        title: t('pathChanged'),
        description: t('pathChangedDesc', { path: displayPath })
      })
    } catch (err) {
      setPathInputValue(previousDisplayPath)

      toast({
        variant: "destructive",
        title: t('navigationFailed'),
        description: err instanceof Error ? err.message : t('unknownError')
      })
    } finally {
      isNavigatingRef.current = false
    }
  }, [currentPath, isWindowsSession, loadPath, loadAllFiles, replaceTree, updateTreeNode, toast, t, triggerCacheUpdate])

  // Navigate to parent directory
  const navigateUp = useCallback(() => {
    if (!currentPath) return

    const isRoot = isWindowsSession
      ? !!currentPath.match(/^[A-Z]:[\\/]?$/)
      : currentPath === '/'

    if (isRoot) return

    const parts = currentPath.split(/[/\\]/).filter(Boolean)
    const parentPath = isWindowsSession
      ? (parts.length === 1 ? parts[0] + '/' : parts.slice(0, -1).join('/'))
      : ('/' + parts.slice(0, -1).join('/'))

    navigateToPath(parentPath)
  }, [currentPath, isWindowsSession, navigateToPath])

  // Navigate to home directory
  const navigateHome = useCallback(() => {
    const homePath = isWindowsSession ? 'C:/' : '/'
    navigateToPath(homePath)
  }, [isWindowsSession, navigateToPath])

  // Check if at root directory
  const isAtRoot = useMemo(() => {
    if (!currentPath) return true
    return isWindowsSession
      ? !!currentPath.match(/^[A-Z]:[\\/]?$/)
      : currentPath === '/'
  }, [currentPath, isWindowsSession])

  // Filter tree data based on search query
  const filterTreeData = useCallback((
    nodes: FileNode[],
    query: string
  ): { filtered: FileNode[]; matchedIds: Set<string>; count: number } => {
    if (!query.trim()) {
      return { filtered: nodes, matchedIds: new Set(), count: 0 }
    }

    const lowerQuery = query.toLowerCase()
    const localMatchedIds = new Set<string>()
    let count = 0

    const filter = (nodeList: FileNode[]): FileNode[] => {
      const result: FileNode[] = []

      for (const node of nodeList) {
        const nameMatches = node.name.toLowerCase().includes(lowerQuery)
        let childrenResult: FileNode[] = []

        if (node.children && node.children.length > 0) {
          childrenResult = filter(node.children)
        }

        if (nameMatches || childrenResult.length > 0) {
          if (nameMatches) {
            localMatchedIds.add(node.id)
            count++
          }

          result.push({
            ...node,
            children: childrenResult,
            _isMatched: nameMatches
          } as FileNode & { _isMatched: boolean })
        }
      }

      return result
    }

    const filtered = filter(nodes)
    return { filtered, matchedIds: localMatchedIds, count }
  }, [])

  // Apply search filter to tree data
  const { filtered: filteredTreeData, matchedIds, count: searchMatchedCount } = useMemo(
    () => filterTreeData(treeData, treeSearchQuery),
    [treeData, treeSearchQuery, filterTreeData]
  )

  // Update matched nodes state
  useEffect(() => {
    setMatchedNodeIds(matchedIds)
    setMatchedCount(searchMatchedCount)
  }, [matchedIds, searchMatchedCount])

  return {
    // Props
    sessionId,

    // Translation & toast
    t,
    toast,

    // File system hooks
    listFiles,
    enumDriversFromAPI,
    mkdir,
    touchFile,
    uploadFile,
    downloadFile,
    catFile,
    rmFile,
    mvFile,
    cpFile,
    chmodFile,
    chownFile,
    pwd,
    cd,
    rpcLoading,
    rpcError,

    // Cache
    getFileTreeCache,
    setFileTreeCache,
    loadFileTreeCache,
    flushFileTreeCache,
    shouldUpdateCache,
    setShouldUpdateCache,
    triggerCacheUpdate,
    cacheMode,
    setCacheMode,
    cacheTimestamps,

    // Refs
    treeRef,
    fileInputRef,
    isNavigatingRef,
    fileCache,
    allFilesCache,

    // Tree state
    treeData,
    setTreeData,
    expandedNodes,
    setExpandedNodes,
    loadingNodes,

    // Selection
    selection,
    setSelection,

    // Navigation
    currentPath,
    setCurrentPath,
    pathInputValue,
    setPathInputValue,
    isEditingPath,
    setIsEditingPath,

    // Operation states
    uploading,
    setUploading,
    deleting,
    setDeleting,
    downloading,
    setDownloading,
    refreshing,
    setRefreshing,
    enumeratingDrivers,
    setEnumeratingDrivers,
    operatingFiles,
    setOperatingFiles,
    creatingFolder,
    setCreatingFolder,
    creatingFile,
    setCreatingFile,
    renaming,
    setRenaming,

    // Dialog states
    showCreateFolder,
    setShowCreateFolder,
    showCreateFile,
    setShowCreateFile,
    showRenameDialog,
    setShowRenameDialog,
    showUploadDialog,
    setShowUploadDialog,
    newFolderName,
    setNewFolderName,
    newFileName,
    setNewFileName,
    renameTarget,
    setRenameTarget,
    newName,
    setNewName,
    selectedUploadFile,
    setSelectedUploadFile,
    uploadTargetPath,
    setUploadTargetPath,
    contextMenuTargetPath,
    setContextMenuTargetPath,

    // Preview
    selectedFile,
    setSelectedFile,

    // File size warning
    fileSizeWarning,
    setFileSizeWarning,

    // View mode
    viewMode,
    setViewMode,

    // Current directory files
    currentDirFiles,
    setCurrentDirFiles,
    currentDirPath,
    setCurrentDirPath,
    visibleFileCount,

    // Upload queue
    uploadQueue,
    setUploadQueue,
    showUploadProgress,
    setShowUploadProgress,
    // Download queue
    downloadQueue,
    setDownloadQueue,
    showDownloadProgress,
    setShowDownloadProgress,
    showProperties,
    setShowProperties,
    selectedPropertyFile,
    setSelectedPropertyFile,
    showPermissionEditor,
    setShowPermissionEditor,
    selectedPermissionFile,
    setSelectedPermissionFile,

    // Tree search
    treeSearchQuery,
    setTreeSearchQuery,
    matchedNodeIds,
    matchedCount,

    // Resize observer
    treeContainerRef,
    treeWidth,
    treeHeight,

    // Responsive
    isMobile,

    // System
    isWindowsSession,

    // Sorting
    sortedFiles,
    sortKey,
    sortDirection,
    handleSort,
    visibleFiles,
    hasMoreVisibleFiles,
    handleFileListScroll,

    // Utility callbacks
    sanitizeFileNodes: dedupeFileNodes,
    updateTreeNode,
    replaceTree,
    isViewableFile,

    // Core file ops
    loadAllFiles,
    loadPath,
    buildTreeFromPath,
    initializeFileSystem,

    // Tree ops & navigation
    handleRefresh,
    handleNodeSelect,
    handleCheckboxToggle,
    handleFileListSelect,
    handleRefreshDirectory,
    handleTreeToggle,
    navigateToPath,
    navigateUp,
    navigateHome,
    isAtRoot,
    filterTreeData,
    filteredTreeData,
  }
}

export type FileManagerState = ReturnType<typeof useFileManagerState>
