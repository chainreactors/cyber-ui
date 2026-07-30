"use client"

import { useCallback, useRef } from "react"
import type { FileNode, UploadProgress, DownloadProgress, UploadQueueState } from "../types"
import {
  normalizePath, formatPathForDisplay,
} from "../utils/file-manager-utils"
import type { FileManagerState } from "./useFileManagerState"
import { isFileManagerAbortError } from "../contracts"
import { pathsEqual } from "../path-strategy"

function newUploadQueueId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `up-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useFileActions(state: FileManagerState) {
  const uploadAbortControllerRef = useRef<AbortController | null>(null)
  const uploadRunIdRef = useRef(0)

  const {
    t,
    toast,
    usesWindowsPaths,
    currentPath,
    currentDirPath,
    currentDirFiles,
    selection,
    selectedFile,
    deleteTargets,
    deleting,
    renameTarget,
    newName,
    renaming,
    newFolderName,
    creatingFolder,
    newFileName,
    creatingFile,
    selectedUploadFile,
    uploadTargetPath,
    contextMenuTargetPath,
    selectedPermissionFile,
    treeRef,
    fileInputRef,
    fileCache,
    allFilesCache,
    cacheTimestamps,
    // File system
    removeEntry,
    renameEntry,
    copyEntry,
    downloadFile,
    uploadFile,
    createDirectory,
    createFileEntry,
    changeMode,
    listRoots,
    // Setters
    setSelection,
    setSelectedFile,
    setDeleteTargets,
    setOperatingFiles,
    setUploading,
    setDeleting,
    setDownloading,
    setRefreshing,
    setLoadingRoots,
    setCreatingFolder,
    setCreatingFile,
    setRenaming,
    setShowCreateFolder,
    setShowCreateFile,
    setShowRenameDialog,
    setShowUploadDialog,
    setNewFolderName,
    setNewFileName,
    setRenameTarget,
    setNewName,
    setSelectedUploadFile,
    setUploadTargetPath,
    setContextMenuTargetPath,
    setUploadQueue,
    setShowUploadProgress,
    setDownloadQueue,
    setShowDownloadProgress,
    setTreeData,
    setCurrentDirFiles,
    // Ops
    loadDirectorySnapshot,
    updateTreeNode,
    sanitizeFileNodes,
    triggerCacheUpdate,
  } = state

  const refreshDirectory = useCallback(async (path: string) => {
    const normalizedPath = normalizePath(path, usesWindowsPaths)
    const snapshot = await loadDirectorySnapshot(normalizedPath, true)
    updateTreeNode(normalizedPath, snapshot.directories)
    if (pathsEqual(normalizedPath, currentDirPath, usesWindowsPaths ? 'windows' : 'posix')) {
      setCurrentDirFiles(snapshot.allFiles)
    }
    return snapshot
  }, [currentDirPath, loadDirectorySnapshot, setCurrentDirFiles, updateTreeNode, usesWindowsPaths])

  const refreshAfterMutation = useCallback(async (path: string) => {
    try {
      await refreshDirectory(path)
      triggerCacheUpdate()
    } catch (error) {
      if (isFileManagerAbortError(error)) return
      toast({
        variant: "destructive",
        title: t('refreshFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    }
  }, [refreshDirectory, t, toast, triggerCacheUpdate])

  const getSelectedNodes = useCallback((): FileNode[] => {
    const visibleNodes = new Map<string, FileNode>()
    for (const file of currentDirFiles) {
      visibleNodes.set(file.id, file)
      if (file.fullPath) visibleNodes.set(file.fullPath, file)
    }

    const selectedNodes: FileNode[] = []
    const selectedPaths = new Set<string>()
    for (const nodeId of selection.selectedIds) {
      const file = visibleNodes.get(nodeId) ?? treeRef.current?.get(nodeId)?.data
      if (file?.fullPath && !selectedPaths.has(file.fullPath)) {
        selectedPaths.add(file.fullPath)
        selectedNodes.push(file)
      }
    }
    return selectedNodes
  }, [currentDirFiles, selection.selectedIds, treeRef])

  const handleRename = useCallback((node: FileNode) => {
    const targetPath = normalizePath(node.fullPath || node.id, usesWindowsPaths)
    setRenameTarget({
      id: node.id,
      name: node.name,
      path: targetPath
    })
    setNewName(node.name)
    setShowRenameDialog(true)
  }, [usesWindowsPaths, setRenameTarget, setNewName, setShowRenameDialog])

  const handleCopy = useCallback(async (node: FileNode) => {
    try {
      if (!node.fullPath) return

      const filename = node.name
      const sourcePath = normalizePath(node.fullPath, usesWindowsPaths)
      const newPath = `${sourcePath}.copy`

      await copyEntry(sourcePath, newPath)

      toast({
        title: t('copySuccess'),
        description: t('copySuccessDesc', { filename })
      })

      const lastSlashIndex = sourcePath.lastIndexOf('/')
      const parentPath = lastSlashIndex === 0 ? '/' : lastSlashIndex > 0 ? sourcePath.slice(0, lastSlashIndex) : sourcePath
      const refreshPath = parentPath || currentPath
      await refreshAfterMutation(refreshPath)
    } catch (error) {
      if (isFileManagerAbortError(error)) return
      toast({
        variant: "destructive",
        title: t('copyFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    }
  }, [copyEntry, toast, t, usesWindowsPaths, currentPath, refreshAfterMutation])

  const handleCopyName = useCallback(async (node: FileNode) => {
    try {
      await navigator.clipboard.writeText(node.name)
      toast({
        title: t('copySuccess'),
        description: t('copyNameSuccessDesc', { name: node.name })
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('copyFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    }
  }, [toast, t])

  const handleCopyPath = useCallback(async (node: FileNode) => {
    try {
      const path = normalizePath(node.fullPath || node.id, usesWindowsPaths)
      const displayPath = formatPathForDisplay(path, usesWindowsPaths)
      await navigator.clipboard.writeText(displayPath)
      toast({
        title: t('copySuccess'),
        description: t('copyPathSuccessDesc', { path: displayPath })
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('copyFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    }
  }, [usesWindowsPaths, toast, t])

  const handleDelete = useCallback(async (node: FileNode) => {
    if (!node.fullPath) return
    setDeleteTargets([node])
  }, [setDeleteTargets])

  const executeDelete = useCallback(async () => {
    const targets = deleteTargets.filter((node) => !!node.fullPath)
    if (targets.length === 0 || deleting) return

    setDeleting(true)
    setOperatingFiles(prev => {
      const next = new Set(prev)
      targets.forEach(node => next.add(node.id))
      return next
    })

    try {
      const results = await Promise.allSettled(targets.map(async (node) => {
        const targetPath = normalizePath(node.fullPath!, usesWindowsPaths)
        await removeEntry(targetPath)
        return { node, targetPath }
      }))
      const succeeded = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
      const failed = results.flatMap(result => result.status === 'rejected' ? [result.reason] : [])

      if (succeeded.length === 0) {
        const error = failed[0]
        toast({
          variant: "destructive",
          title: targets.length === 1 ? t('deleteFailed') : t('batchDeleteFailed'),
          description: error instanceof Error ? error.message : t('unknownError')
        })
        return
      }

      const deletedIds = new Set(succeeded.flatMap(({ node }) => [node.id, node.fullPath || node.id]))
      setSelection(prev => {
        const selectedIds = new Set(prev.selectedIds)
        deletedIds.forEach(id => selectedIds.delete(id))
        return { ...prev, selectedIds, lastSelectedId: null }
      })

      if (selectedFile && deletedIds.has(selectedFile.id)) {
        setSelectedFile(null)
      }

      if (targets.length === 1 && failed.length === 0) {
        toast({
          title: t('deleteSuccess'),
          description: t('deleteSuccessDesc', { filename: targets[0].name })
        })
      } else {
        toast({
          title: t('batchDeleteComplete'),
          description: t('batchDeleteCompleteDesc', {
            success: succeeded.length,
            failed: failed.length > 0 ? t('failedCount', { count: failed.length }) : ''
          })
        })
      }

      const parentPaths = new Set(succeeded.map(({ targetPath }) => {
        const lastSlashIndex = targetPath.lastIndexOf('/')
        if (lastSlashIndex === 0) return '/'
        if (lastSlashIndex > 0) return targetPath.slice(0, lastSlashIndex)
        return currentPath
      }))

      try {
        await Promise.all(Array.from(parentPaths, refreshDirectory))
        triggerCacheUpdate()
      } catch (error) {
        if (!isFileManagerAbortError(error)) {
          toast({
            variant: "destructive",
            title: t('refreshFailed'),
            description: error instanceof Error ? error.message : t('unknownError')
          })
        }
      }
    } finally {
      setDeleteTargets([])
      setDeleting(false)
      setOperatingFiles(prev => {
        const newSet = new Set(prev)
        targets.forEach(node => newSet.delete(node.id))
        return newSet
      })
    }
  }, [currentPath, deleteTargets, deleting, refreshDirectory, removeEntry, selectedFile, setDeleteTargets, setDeleting, setOperatingFiles, setSelectedFile, setSelection, t, toast, triggerCacheUpdate, usesWindowsPaths])

  const handleDownload = useCallback(async (node: FileNode) => {
    if (!node.fullPath) return

    try {
      setOperatingFiles(prev => new Set(prev).add(node.id))

      await downloadFile(node.fullPath, {
        name: node.name,
        bufferSize: 1024 * 1024,
        dir: node.isDirectory || false
      })

      toast({
        title: t('downloadTask.submitted'),
        description: t('downloadTask.submittedDesc'),
      })
    } catch (error) {
      toast({
        title: t('downloadTask.failed'),
        description: error instanceof Error ? error.message : 'Download failed',
        variant: 'destructive',
      })
    } finally {
      setOperatingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(node.id)
        return newSet
      })
    }
  }, [downloadFile, setOperatingFiles, toast, t])

  // Batch operations
  const handleBatchDownload = useCallback(async () => {
    if (selection.selectedIds.size === 0) return

    const nodesToDownload = getSelectedNodes()

    if (nodesToDownload.length === 0) {
      return
    }

    setDownloading(true)
    try {
      const results = await Promise.allSettled(nodesToDownload.map((item) =>
        downloadFile(item.fullPath!, {
            name: item.name,
            bufferSize: 1024 * 1024,
            dir: item.isDirectory || false,
          })
      ))
      const successCount = results.filter(result => result.status === 'fulfilled').length
      const errorCount = results.length - successCount

      toast({
        title: t('downloadTask.batchSubmitted'),
        description: t('downloadTask.batchSubmittedDesc', { success: successCount, error: errorCount, total: nodesToDownload.length }),
        variant: errorCount > 0 ? 'destructive' : 'default',
      })
    } finally {
      setDownloading(false)
    }
  }, [selection.selectedIds, downloadFile, getSelectedNodes, setDownloading, toast, t])

  const handleBatchDelete = useCallback(async () => {
    if (selection.selectedIds.size === 0) return
    const targets = getSelectedNodes()
    if (targets.length > 0) setDeleteTargets(targets)
  }, [getSelectedNodes, selection.selectedIds, setDeleteTargets])

  // Handle file selection for upload dialog
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      setSelectedUploadFile(file)
      if (!uploadTargetPath) {
        const defaultDir = normalizePath(contextMenuTargetPath || currentPath, usesWindowsPaths)
        const defaultTarget = normalizePath(`${defaultDir}/${file.name}`, usesWindowsPaths)
        setUploadTargetPath(formatPathForDisplay(defaultTarget, usesWindowsPaths))
      }
    }
    event.target.value = ''
  }, [uploadTargetPath, contextMenuTargetPath, currentPath, usesWindowsPaths, setSelectedUploadFile, setUploadTargetPath])

  // Execute file upload from dialog
  const executeUpload = useCallback(async () => {
    if (!selectedUploadFile) return

    const file = selectedUploadFile
    uploadAbortControllerRef.current?.abort()
    const runId = uploadRunIdRef.current + 1
    uploadRunIdRef.current = runId
    const abortController = new AbortController()
    uploadAbortControllerRef.current = abortController
    const id = newUploadQueueId()
    const updateQueue = (updater: (prev: UploadQueueState) => UploadQueueState) => {
      setUploadQueue((prev) => uploadRunIdRef.current === runId ? updater(prev) : prev)
    }
    let uploaded = false
    let targetDir = ''

    try {
      setUploading(true)

      let targetPath = uploadTargetPath.trim()

      if (!targetPath) {
        const targetDir = normalizePath(contextMenuTargetPath || currentPath, usesWindowsPaths)
        targetPath = normalizePath(`${targetDir}/${file.name}`, usesWindowsPaths)
      } else {
        targetPath = normalizePath(targetPath, usesWindowsPaths)

        if (!targetPath.includes('/')) {
          const targetDir = normalizePath(contextMenuTargetPath || currentPath, usesWindowsPaths)
          targetPath = normalizePath(`${targetDir}/${targetPath}`, usesWindowsPaths)
        }
      }

      const lastSepIndex = targetPath.lastIndexOf('/')
      targetDir = lastSepIndex === 0 ? '/' : lastSepIndex > 0 ? targetPath.slice(0, lastSepIndex) : (usesWindowsPaths ? 'C:' : '/')
      const displayTargetDir = formatPathForDisplay(targetDir, usesWindowsPaths)

      setUploadQueue({
        progresses: new Map([[
          id,
          {
            id,
            fileName: file.name,
            totalSize: file.size,
            progress: 0,
            status: 'uploading',
          },
        ]]),
        currentIndex: 0,
        totalFiles: 1,
        aborted: false,
      })
      setShowUploadProgress(true)
      setShowUploadDialog(false)
      setSelectedUploadFile(null)
      setUploadTargetPath('')
      setContextMenuTargetPath(null)

      toast({
        title: t('uploading'),
        description: t('uploadingTo', { filename: file.name, path: displayTargetDir })
      })

      await uploadFile(file.name, targetPath, file, {
        signal: abortController.signal,
        onProgress: (info) => {
          updateQueue((prev) => {
            const progresses = new Map(prev.progresses)
            progresses.set(id, {
              id,
              fileName: file.name,
              totalSize: file.size,
              progress: info.progress,
              status:
                info.phase === 'delivering'
                  ? 'delivering'
                  : info.phase === 'staged'
                    ? 'staged'
                    : 'uploading',
            })
            return { ...prev, progresses }
          })
        },
      })

      if (uploadRunIdRef.current !== runId || abortController.signal.aborted) {
        return
      }

      updateQueue((prev) => {
        const progresses = new Map(prev.progresses)
        progresses.set(id, {
          id,
          fileName: file.name,
          totalSize: file.size,
          progress: 100,
          status: 'completed',
        })
        return { ...prev, progresses }
      })
      uploaded = true

      toast({
        title: t('uploadSuccess'),
        description: t('uploadSuccessDesc', { filename: file.name, path: displayTargetDir })
      })
    } catch (error) {
      const aborted = abortController.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')
      updateQueue((prev) => {
        const progresses = new Map(prev.progresses)
        progresses.set(id, {
          id,
          fileName: file.name,
          totalSize: file.size,
          progress: 0,
          status: aborted ? 'canceled' : 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        })
        return { ...prev, progresses }
      })
      if (!aborted && uploadRunIdRef.current === runId) {
        toast({
          variant: "destructive",
          title: t('uploadFailed'),
          description: error instanceof Error ? error.message : t('unknownError')
        })
      }
    } finally {
      if (uploadAbortControllerRef.current === abortController) {
        uploadAbortControllerRef.current = null
        setUploading(false)
      }
    }

    if (!uploaded || uploadRunIdRef.current !== runId || abortController.signal.aborted) {
      return
    }

    try {
      const snapshot = await loadDirectorySnapshot(targetDir, true)
      if (uploadRunIdRef.current !== runId) return
      updateTreeNode(targetDir, snapshot.directories)
      if (
        pathsEqual(targetDir, currentDirPath, usesWindowsPaths ? 'windows' : 'posix')
      ) {
        if (uploadRunIdRef.current === runId) {
          setCurrentDirFiles(snapshot.allFiles)
        }
      }
    } catch (error) {
      if (uploadRunIdRef.current === runId && !isFileManagerAbortError(error)) {
        toast({
          variant: "destructive",
          title: t('refreshFailed'),
          description: error instanceof Error ? error.message : t('unknownError')
        })
      }
    }
  }, [selectedUploadFile, uploadTargetPath, contextMenuTargetPath, currentPath, currentDirPath, uploadFile, toast, t, loadDirectorySnapshot, updateTreeNode, usesWindowsPaths, setUploading, setShowUploadDialog, setSelectedUploadFile, setUploadTargetPath, setContextMenuTargetPath, setUploadQueue, setShowUploadProgress, setCurrentDirFiles])

  // Handle files dropped for drag and drop upload
  const handleFilesDropped = useCallback(async (files: File[]) => {
    uploadAbortControllerRef.current?.abort()
    const runId = uploadRunIdRef.current + 1
    uploadRunIdRef.current = runId

    const items = files.map((file) => ({
      id: newUploadQueueId(),
      file,
    }))
    const initialProgresses = new Map<string, UploadProgress>()
    items.forEach(({ id, file }) => {
      initialProgresses.set(id, {
        id,
        fileName: file.name,
        totalSize: file.size,
        progress: 0,
        status: 'pending',
      })
    })

    const abortController = new AbortController()
    uploadAbortControllerRef.current = abortController

    const updateQueue = (updater: (prev: UploadQueueState) => UploadQueueState) => {
      setUploadQueue((prev) => uploadRunIdRef.current === runId ? updater(prev) : prev)
    }

    setUploadQueue({
      progresses: initialProgresses,
      currentIndex: 0,
      totalFiles: items.length,
      aborted: false,
    })
    setShowUploadProgress(true)

    let currentIndex = 0
    for (const { id, file } of items) {
      if (abortController.signal.aborted) {
        updateQueue((prev) => {
          const progresses = new Map(prev.progresses)
          progresses.set(id, {
            id,
            fileName: file.name,
            totalSize: file.size,
            progress: 0,
            status: 'canceled',
          })
          return { ...prev, progresses }
        })
        continue
      }

      try {
        updateQueue((prev) => {
          const progresses = new Map(prev.progresses)
          progresses.set(id, {
            id,
            fileName: file.name,
            totalSize: file.size,
            progress: 0,
            status: 'uploading',
          })
          return {
            ...prev,
            progresses,
            currentIndex,
          }
        })

        const targetPath = normalizePath(`${currentPath}/${file.name}`, usesWindowsPaths)

        await uploadFile(file.name, targetPath, file, {
          signal: abortController.signal,
          onProgress: (info) => {
            updateQueue((prev) => {
              const progresses = new Map(prev.progresses)
              progresses.set(id, {
                id,
                fileName: file.name,
                totalSize: file.size,
                progress: info.progress,
                status:
                  info.phase === 'delivering'
                    ? 'delivering'
                    : info.phase === 'staged'
                      ? 'staged'
                      : 'uploading',
              })
              return { ...prev, progresses }
            })
          },
        })

        updateQueue((prev) => {
          const progresses = new Map(prev.progresses)
          progresses.set(id, {
            id,
            fileName: file.name,
            totalSize: file.size,
            progress: 100,
            status: prev.aborted ? 'canceled' : 'completed',
          })
          return {
            ...prev,
            progresses,
          }
        })
      } catch (error) {
        updateQueue((prev) => {
          const progresses = new Map(prev.progresses)
          const aborted = abortController.signal.aborted || prev.aborted || (error instanceof DOMException && error.name === 'AbortError')
          progresses.set(id, {
            id,
            fileName: file.name,
            totalSize: file.size,
            progress: 0,
            status: aborted ? 'canceled' : 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
          })
          return {
            ...prev,
            progresses,
          }
        })
      }
      currentIndex++
    }

    if (uploadRunIdRef.current !== runId || abortController.signal.aborted) {
      return
    }
    if (uploadAbortControllerRef.current === abortController) {
      uploadAbortControllerRef.current = null
    }

    // Refresh directory after all uploads complete
    try {
      const snapshot = await loadDirectorySnapshot(currentPath, true)
      if (uploadRunIdRef.current !== runId) return
      updateTreeNode(currentPath, snapshot.directories)
      if (uploadRunIdRef.current === runId) {
        setCurrentDirFiles(snapshot.allFiles)
      }
    } catch (error) {
      if (!isFileManagerAbortError(error)) {
        toast({
          variant: "destructive",
          title: t('refreshFailed'),
          description: error instanceof Error ? error.message : t('unknownError')
        })
      }
    }
  }, [currentPath, uploadFile, loadDirectorySnapshot, updateTreeNode, usesWindowsPaths, setUploadQueue, setShowUploadProgress, setCurrentDirFiles, t, toast])

  const cancelUploads = useCallback(() => {
    uploadRunIdRef.current += 1
    uploadAbortControllerRef.current?.abort()
    uploadAbortControllerRef.current = null
    setUploading(false)
    setUploadQueue((prev) => {
      const progresses = new Map(prev.progresses)
      for (const [id, progress] of progresses) {
        if (progress.status === 'completed' || progress.status === 'error' || progress.status === 'canceled') {
          continue
        }
        progresses.set(id, {
          ...progress,
          status: 'canceled',
        })
      }
      return {
        ...prev,
        progresses,
        aborted: true,
      }
    })
    setShowUploadProgress(false)
  }, [setShowUploadProgress, setUploadQueue, setUploading])

  // Handle permission save
  const handleSavePermissions = useCallback(
    async (mode: number) => {
      if (!selectedPermissionFile) return

      try {
        await changeMode(selectedPermissionFile.fullPath || '', mode.toString(8))

        toast({
          title: t('permissions.saveSuccess'),
          description: t('permissions.saveSuccessDesc'),
        })

        await refreshAfterMutation(currentPath)
      } catch (error) {
        if (isFileManagerAbortError(error)) return
        toast({
          variant: 'destructive',
          title: t('permissions.saveFailed'),
          description: error instanceof Error ? error.message : t('unknownError'),
        })
        throw error
      }
    },
    [selectedPermissionFile, changeMode, toast, t, currentPath, refreshAfterMutation]
  )

  // Load additional roots for Windows path spaces.
  const handleLoadRoots = useCallback(async () => {
    if (!usesWindowsPaths) return

    setLoadingRoots(true)
    try {
      const rootInfos = await listRoots()

      if (!rootInfos || rootInfos.length === 0) {
        toast({
          variant: "destructive",
          title: t('loadRootsFailed'),
          description: t('noRootsFound')
        })
        return
      }

      const rootNodes: FileNode[] = rootInfos.map((rootInfo: Record<string, unknown>) => {
        const rootPath = (rootInfo.path as string) || String(rootInfo)
        const normalizedPath = typeof rootPath === 'string'
          ? rootPath.replace(/\\/g, '').replace(/\/$/, '') + ':'
          : String(rootPath)

        const rootId = normalizedPath.match(/^[A-Z]:$/)
          ? normalizedPath
          : normalizedPath.charAt(0).toUpperCase() + ':'

        return {
          id: rootId,
          name: rootId,
          fullPath: rootId,
          isDirectory: true,
          isLazy: true,
          children: []
        }
      })

      setTreeData(prevData => {
        const existingRootIds = new Set(
          prevData
            .filter(node => typeof node.id === 'string' && node.id.match(/^[A-Z]:$/))
            .map(node => node.id)
        )

        const newRoots = rootNodes.filter(root => !existingRootIds.has(root.id))

        return sanitizeFileNodes([...prevData, ...newRoots].sort((a, b) => {
          const aIsDrive = typeof a.id === 'string' && a.id.match(/^[A-Z]:$/)
          const bIsDrive = typeof b.id === 'string' && b.id.match(/^[A-Z]:$/)

          if (aIsDrive && bIsDrive) {
            return a.id.localeCompare(b.id)
          }
          if (aIsDrive) return -1
          if (bIsDrive) return 1
          return a.name.localeCompare(b.name)
        }))
      })

      toast({
        title: t('loadRootsSuccess'),
        description: t('loadRootsSuccessDesc', { count: rootInfos.length })
      })
    } catch (error) {
      console.error('Failed to load file roots:', error)
      toast({
        variant: "destructive",
        title: t('loadRootsFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setLoadingRoots(false)
    }
  }, [usesWindowsPaths, listRoots, toast, t, setLoadingRoots, setTreeData, sanitizeFileNodes])

  // Create folder
  const handleCreateFolder = useCallback(async (targetPath?: string) => {
    const pathToUse = normalizePath(targetPath || currentPath, usesWindowsPaths)
    if (!newFolderName.trim() || creatingFolder) return

    setCreatingFolder(true)
    try {
      const displayPath = formatPathForDisplay(pathToUse, usesWindowsPaths)

      toast({
        title: t('creating'),
        description: t('creatingFolder', { name: newFolderName.trim(), path: displayPath })
      })

      const folderPath = normalizePath(`${pathToUse}/${newFolderName.trim()}`, usesWindowsPaths)

      await createDirectory(folderPath)

      toast({
        title: t('folderCreateSuccess'),
        description: t('folderCreateSuccessDesc', { name: newFolderName, path: displayPath })
      })

      setShowCreateFolder(false)
      setNewFolderName('')
      setContextMenuTargetPath(null)

      await refreshAfterMutation(pathToUse)
    } catch (error) {
      if (isFileManagerAbortError(error)) return
      toast({
        variant: "destructive",
        title: t('folderCreateFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setCreatingFolder(false)
    }
  }, [newFolderName, currentPath, createDirectory, toast, t, usesWindowsPaths, creatingFolder, setCreatingFolder, setShowCreateFolder, setNewFolderName, setContextMenuTargetPath, refreshAfterMutation])

  // Create file
  const handleCreateFile = useCallback(async (targetPath?: string) => {
    const pathToUse = normalizePath(targetPath || currentPath, usesWindowsPaths)
    if (!newFileName.trim() || creatingFile) return

    setCreatingFile(true)
    try {
      const displayPath = formatPathForDisplay(pathToUse, usesWindowsPaths)

      toast({
        title: t('creating'),
        description: t('creatingFile', { fileName: newFileName.trim(), path: displayPath })
      })

      const filePath = normalizePath(`${pathToUse}/${newFileName.trim()}`, usesWindowsPaths)
      await createFileEntry(filePath)

      toast({
        title: t('fileCreateSuccess'),
        description: t('fileCreateSuccessDesc', { fileName: newFileName.trim(), currentPath: displayPath })
      })

      setShowCreateFile(false)
      setNewFileName('')
      setContextMenuTargetPath(null)

      await refreshAfterMutation(pathToUse)
    } catch (error) {
      if (isFileManagerAbortError(error)) return
      toast({
        variant: "destructive",
        title: t('fileCreateFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setCreatingFile(false)
    }
  }, [newFileName, currentPath, createFileEntry, toast, t, creatingFile, usesWindowsPaths, setCreatingFile, setShowCreateFile, setNewFileName, setContextMenuTargetPath, refreshAfterMutation])

  // Refresh current directory
  const handleRefreshCurrentDirectory = useCallback(async (targetPath?: unknown) => {
    const refreshTarget = typeof targetPath === 'string' && targetPath.trim()
      ? targetPath
      : currentPath
    const pathToUse = normalizePath(refreshTarget, usesWindowsPaths)
    setRefreshing(true)
    try {
      fileCache.current.delete(pathToUse)
      allFilesCache.current.delete(pathToUse)
      cacheTimestamps.current.delete(`tree:${pathToUse}`)
      cacheTimestamps.current.delete(`all:${pathToUse}`)

      const snapshot = await loadDirectorySnapshot(pathToUse, true)
      updateTreeNode(pathToUse, snapshot.directories)

      if (pathsEqual(pathToUse, currentDirPath, usesWindowsPaths ? 'windows' : 'posix')) {
        setCurrentDirFiles(snapshot.allFiles)
      }

      toast({
        title: t('refreshSuccess'),
        description: t('refreshSuccessDesc')
      })

      triggerCacheUpdate()
    } catch (error) {
      if (isFileManagerAbortError(error)) return
      toast({
        variant: "destructive",
        title: t('refreshFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setRefreshing(false)
    }
  }, [currentPath, currentDirPath, usesWindowsPaths, loadDirectorySnapshot, updateTreeNode, toast, t, triggerCacheUpdate, fileCache, allFilesCache, cacheTimestamps, setRefreshing, setCurrentDirFiles])

  // Execute rename
  const executeRename = useCallback(async () => {
    if (!renameTarget || !newName.trim() || newName.trim() === renameTarget.name || renaming) return

    setRenaming(true)
    try {
      const normalizedPath = normalizePath(renameTarget.path, usesWindowsPaths)
      const pathParts = normalizedPath.split('/')
      pathParts[pathParts.length - 1] = newName.trim()
      const newPath = normalizePath(pathParts.join('/'), usesWindowsPaths)

      await renameEntry(normalizedPath, newPath)

      toast({
        title: t('renameSuccess'),
        description: t('renameSuccessDesc', { oldName: renameTarget.name, newName: newName.trim() })
      })

      setShowRenameDialog(false)
      setRenameTarget(null)
      setNewName('')
      await refreshAfterMutation(currentPath)
    } catch (error) {
      if (isFileManagerAbortError(error)) return
      toast({
        variant: "destructive",
        title: t('renameFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setRenaming(false)
    }
  }, [renameTarget, newName, renameEntry, toast, t, currentPath, usesWindowsPaths, renaming, setRenaming, setShowRenameDialog, setRenameTarget, setNewName, refreshAfterMutation])

  return {
    handleRename,
    handleCopy,
    handleCopyName,
    handleCopyPath,
    handleDelete,
    executeDelete,
    handleDownload,
    handleBatchDownload,
    handleBatchDelete,
    handleFileSelect,
    executeUpload,
    handleFilesDropped,
    cancelUploads,
    handleSavePermissions,
    handleLoadRoots,
    handleCreateFolder,
    handleCreateFile,
    handleRefreshCurrentDirectory,
    executeRename,
  }
}

export type FileActions = ReturnType<typeof useFileActions>
