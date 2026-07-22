"use client"

import { useCallback } from "react"
import type { FileNode, UploadProgress, DownloadProgress } from "../types"
import {
  normalizePath, formatPathForDisplay,
} from "../utils/file-manager-utils"
import type { FileManagerState } from "./useFileManagerState"

export function useFileActions(state: FileManagerState) {
  const {
    t,
    toast,
    sessionId,
    isWindowsSession,
    currentPath,
    currentDirPath,
    selection,
    selectedFile,
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
    rmFile,
    mvFile,
    cpFile,
    downloadFile,
    uploadFile,
    mkdir,
    touchFile,
    chmodFile,
    enumDriversFromAPI,
    // Setters
    setSelection,
    setSelectedFile,
    setOperatingFiles,
    setUploading,
    setDeleting,
    setDownloading,
    setRefreshing,
    setEnumeratingDrivers,
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
    loadPath,
    loadAllFiles,
    updateTreeNode,
    sanitizeFileNodes,
    triggerCacheUpdate,
  } = state

  // We need to accept sessionId from state
  const sid = sessionId

  const handleRename = useCallback((node: FileNode) => {
    const targetPath = normalizePath(node.fullPath || node.id, isWindowsSession)
    setRenameTarget({
      id: node.id,
      name: node.name,
      path: targetPath
    })
    setNewName(node.name)
    setShowRenameDialog(true)
  }, [isWindowsSession, setRenameTarget, setNewName, setShowRenameDialog])

  const handleCopy = useCallback(async (node: FileNode) => {
    try {
      if (!node.fullPath) return

      const filename = node.name
      const sourcePath = normalizePath(node.fullPath, isWindowsSession)
      const newPath = `${sourcePath}.copy`

      await cpFile(sid, sourcePath, newPath)

      toast({
        title: t('copySuccess'),
        description: t('copySuccessDesc', { filename })
      })

      const lastSlashIndex = sourcePath.lastIndexOf('/')
      const parentPath = lastSlashIndex === 0 ? '/' : lastSlashIndex > 0 ? sourcePath.slice(0, lastSlashIndex) : sourcePath
      const refreshPath = parentPath || currentPath
      const treeChildren = await loadPath(refreshPath, true)
      updateTreeNode(refreshPath, treeChildren)
      if (normalizePath(refreshPath, isWindowsSession) === normalizePath(currentDirPath, isWindowsSession)) {
        const allFiles = await loadAllFiles(refreshPath, true)
        setCurrentDirFiles(allFiles)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('copyFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    }
  }, [sid, cpFile, toast, t, loadPath, loadAllFiles, updateTreeNode, isWindowsSession, currentPath, currentDirPath, setCurrentDirFiles])

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
      const path = normalizePath(node.fullPath || node.id, isWindowsSession)
      const displayPath = formatPathForDisplay(path, isWindowsSession)
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
  }, [isWindowsSession, toast, t])

  const handleDelete = useCallback(async (node: FileNode) => {
    if (!node.fullPath) return

    try {
      setOperatingFiles(prev => new Set(prev).add(node.id))
      const targetPath = normalizePath(node.fullPath, isWindowsSession)
      await rmFile(sid, targetPath)

      toast({
        title: t('deleteSuccess'),
        description: t('deleteSuccessDesc', { filename: node.name })
      })

      setSelection(prev => {
        const newSelectedIds = new Set(prev.selectedIds)
        newSelectedIds.delete(node.id)
        return { ...prev, selectedIds: newSelectedIds }
      })

      const lastSlashIndex = targetPath.lastIndexOf('/')
      const parentPath = lastSlashIndex === 0 ? '/' : lastSlashIndex > 0 ? targetPath.slice(0, lastSlashIndex) : targetPath
      const refreshPath = parentPath || currentPath
      const treeChildren = await loadPath(refreshPath, true)
      updateTreeNode(refreshPath, treeChildren)
      if (normalizePath(refreshPath, isWindowsSession) === normalizePath(currentDirPath, isWindowsSession)) {
        const allFiles = await loadAllFiles(refreshPath, true)
        setCurrentDirFiles(allFiles)
      }

      if (selectedFile?.id === node.id) {
        setSelectedFile(null)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('deleteFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setOperatingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(node.id)
        return newSet
      })
    }
  }, [sid, rmFile, toast, t, selectedFile, loadPath, loadAllFiles, updateTreeNode, isWindowsSession, currentPath, currentDirPath, setOperatingFiles, setSelection, setSelectedFile, setCurrentDirFiles])

  const handleDownload = useCallback(async (node: FileNode) => {
    if (!node.fullPath) return

    try {
      setOperatingFiles(prev => new Set(prev).add(node.id))

      await downloadFile(sid, node.fullPath, {
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
  }, [sid, downloadFile, setOperatingFiles, toast, t])

  // Batch operations
  const handleBatchDownload = useCallback(async () => {
    if (selection.selectedIds.size === 0) return

    setDownloading(true)

    const nodesToDownload: { name: string; fullPath: string; isDirectory: boolean }[] = []
    for (const nodeId of selection.selectedIds) {
      const tree = treeRef.current
      const node = tree?.get(nodeId)
      if (node && node.data.fullPath) {
        nodesToDownload.push({
          name: node.data.name,
          fullPath: node.data.fullPath,
          isDirectory: node.data.isDirectory || false,
        })
      }
    }

    if (nodesToDownload.length === 0) {
      setDownloading(false)
      return
    }

    let successCount = 0
    let errorCount = 0

    try {
      for (const item of nodesToDownload) {
        try {
          await downloadFile(sid, item.fullPath, {
            name: item.name,
            bufferSize: 1024 * 1024,
            dir: item.isDirectory,
          })
          successCount++
        } catch {
          errorCount++
        }
      }

      toast({
        title: t('downloadTask.batchSubmitted'),
        description: t('downloadTask.batchSubmittedDesc', { success: successCount, error: errorCount, total: nodesToDownload.length }),
        variant: errorCount > 0 ? 'destructive' : 'default',
      })
    } finally {
      setDownloading(false)
    }
  }, [selection.selectedIds, sid, downloadFile, treeRef, setDownloading, toast, t])

  const handleBatchDelete = useCallback(async () => {
    if (selection.selectedIds.size === 0) return

    if (!confirm(t('confirmBatchDelete', { count: selection.selectedIds.size }))) {
      return
    }

    setDeleting(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const nodeId of selection.selectedIds) {
        try {
          const tree = treeRef.current
          const node = tree?.get(nodeId)

          if (node && node.data.fullPath) {
            const targetPath = normalizePath(node.data.fullPath, isWindowsSession)
            await rmFile(sid, targetPath)
            successCount++
          }
        } catch (error) {
          errorCount++
          console.error(`Failed to delete ${nodeId}:`, error)
        }
      }

      if (successCount > 0) {
        toast({
          title: t('batchDeleteComplete'),
          description: t('batchDeleteCompleteDesc', {
            success: successCount,
            failed: errorCount > 0 ? t('failedCount', { count: errorCount }) : ''
          })
        })

        setSelection({ selectedIds: new Set(), lastSelectedId: null, selectRange: false })
        setSelectedFile(null)
        const treeChildren = await loadPath(currentPath, true)
        updateTreeNode(currentPath, treeChildren)
        const allFiles = await loadAllFiles(currentPath, true)
        setCurrentDirFiles(allFiles)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('batchDeleteFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setDeleting(false)
    }
  }, [selection.selectedIds, sid, rmFile, toast, t, currentPath, loadPath, loadAllFiles, updateTreeNode, treeRef, setDeleting, setSelection, setSelectedFile, setCurrentDirFiles])

  // Handle file selection for upload dialog
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      setSelectedUploadFile(file)
      if (!uploadTargetPath) {
        const defaultDir = normalizePath(contextMenuTargetPath || currentPath, isWindowsSession)
        const defaultTarget = normalizePath(`${defaultDir}/${file.name}`, isWindowsSession)
        setUploadTargetPath(formatPathForDisplay(defaultTarget, isWindowsSession))
      }
    }
    event.target.value = ''
  }, [uploadTargetPath, contextMenuTargetPath, currentPath, isWindowsSession, setSelectedUploadFile, setUploadTargetPath])

  // Execute file upload from dialog
  const executeUpload = useCallback(async () => {
    if (!selectedUploadFile) return

    try {
      setUploading(true)

      let targetPath = uploadTargetPath.trim()

      if (!targetPath) {
        const targetDir = normalizePath(contextMenuTargetPath || currentPath, isWindowsSession)
        targetPath = normalizePath(`${targetDir}/${selectedUploadFile.name}`, isWindowsSession)
      } else {
        targetPath = normalizePath(targetPath, isWindowsSession)

        if (!targetPath.includes('/')) {
          const targetDir = normalizePath(contextMenuTargetPath || currentPath, isWindowsSession)
          targetPath = normalizePath(`${targetDir}/${targetPath}`, isWindowsSession)
        }
      }

      const lastSepIndex = targetPath.lastIndexOf('/')
      const targetDir = lastSepIndex === 0 ? '/' : lastSepIndex > 0 ? targetPath.slice(0, lastSepIndex) : (isWindowsSession ? 'C:' : '/')
      const displayTargetDir = formatPathForDisplay(targetDir, isWindowsSession)

      toast({
        title: t('uploading'),
        description: t('uploadingTo', { filename: selectedUploadFile.name, path: displayTargetDir })
      })

      const fileBuffer = await selectedUploadFile.arrayBuffer()
      await uploadFile(sid, selectedUploadFile.name, targetPath, fileBuffer, {
        override: true
      })

      toast({
        title: t('uploadSuccess'),
        description: t('uploadSuccessDesc', { filename: selectedUploadFile.name, path: displayTargetDir })
      })

      const treeChildren = await loadPath(targetDir, true)
      updateTreeNode(targetDir, treeChildren)
      if (targetDir === currentPath || normalizePath(targetDir, isWindowsSession) === normalizePath(currentPath, isWindowsSession)) {
        const allFiles = await loadAllFiles(targetDir, true)
        setCurrentDirFiles(allFiles)
      }

      setShowUploadDialog(false)
      setSelectedUploadFile(null)
      setUploadTargetPath('')
      setContextMenuTargetPath(null)
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('uploadFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setUploading(false)
    }
  }, [selectedUploadFile, uploadTargetPath, contextMenuTargetPath, currentPath, sid, uploadFile, toast, t, loadPath, loadAllFiles, updateTreeNode, isWindowsSession, setUploading, setShowUploadDialog, setSelectedUploadFile, setUploadTargetPath, setContextMenuTargetPath, setCurrentDirFiles])

  // Handle files dropped for drag and drop upload
  const handleFilesDropped = useCallback(async (files: File[]) => {
    const initialProgresses = new Map<string, UploadProgress>()
    files.forEach((file) => {
      initialProgresses.set(file.name, {
        fileName: file.name,
        progress: 0,
        status: 'pending',
      })
    })

    setUploadQueue({
      files,
      progresses: initialProgresses,
      currentIndex: 0,
      totalFiles: files.length,
    })
    setShowUploadProgress(true)

    let currentIndex = 0
    for (const file of files) {
      try {
        setUploadQueue((prev) => {
          const newProgresses = new Map(prev.progresses)
          newProgresses.set(file.name, {
            fileName: file.name,
            progress: 0,
            status: 'uploading',
          })
          return {
            ...prev,
            progresses: newProgresses,
            currentIndex,
          }
        })

        const fileBuffer = await file.arrayBuffer()
        const targetPath = normalizePath(`${currentPath}/${file.name}`, isWindowsSession)

        await uploadFile(sid, file.name, targetPath, fileBuffer, {
          override: true,
        })

        setUploadQueue((prev) => {
          const newProgresses = new Map(prev.progresses)
          newProgresses.set(file.name, {
            fileName: file.name,
            progress: 100,
            status: 'completed',
          })
          return {
            ...prev,
            progresses: newProgresses,
          }
        })
      } catch (error) {
        setUploadQueue((prev) => {
          const newProgresses = new Map(prev.progresses)
          newProgresses.set(file.name, {
            fileName: file.name,
            progress: 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
          })
          return {
            ...prev,
            progresses: newProgresses,
          }
        })
      }
      currentIndex++
    }

    // Refresh directory after all uploads complete
    const treeChildren = await loadPath(currentPath, true)
    updateTreeNode(currentPath, treeChildren)
    const allFiles = await loadAllFiles(currentPath, true)
    setCurrentDirFiles(allFiles)
  }, [currentPath, sid, uploadFile, loadPath, loadAllFiles, updateTreeNode, isWindowsSession, setUploadQueue, setShowUploadProgress, setCurrentDirFiles])

  // Handle permission save
  const handleSavePermissions = useCallback(
    async (mode: number) => {
      if (!selectedPermissionFile) return

      try {
        await chmodFile(sid, selectedPermissionFile.fullPath || '', mode.toString(8))

        toast({
          title: t('permissions.saveSuccess'),
          description: t('permissions.saveSuccessDesc'),
        })

        const treeChildren = await loadPath(currentPath, true)
        updateTreeNode(currentPath, treeChildren)
        const allFiles = await loadAllFiles(currentPath, true)
        setCurrentDirFiles(allFiles)
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('permissions.saveFailed'),
          description: error instanceof Error ? error.message : t('unknownError'),
        })
        throw error
      }
    },
    [selectedPermissionFile, sid, chmodFile, toast, t, loadPath, loadAllFiles, updateTreeNode, currentPath, setCurrentDirFiles]
  )

  // Enumerate drivers (Windows only)
  const handleEnumDrivers = useCallback(async () => {
    if (!isWindowsSession) return

    setEnumeratingDrivers(true)
    try {
      const driveInfos = await enumDriversFromAPI(sid)

      if (!driveInfos || driveInfos.length === 0) {
        toast({
          variant: "destructive",
          title: t('enumDriversFailed'),
          description: t('noDriversFound')
        })
        return
      }

      const driverNodes: FileNode[] = driveInfos.map((driveInfo: Record<string, unknown>) => {
        const drivePath = (driveInfo.path as string) || String(driveInfo)
        const normalizedPath = typeof drivePath === 'string'
          ? drivePath.replace(/\\/g, '').replace(/\/$/, '') + ':'
          : String(drivePath)

        const driveId = normalizedPath.match(/^[A-Z]:$/)
          ? normalizedPath
          : normalizedPath.charAt(0).toUpperCase() + ':'

        return {
          id: driveId,
          name: driveId,
          fullPath: driveId,
          isDirectory: true,
          isLazy: true,
          children: []
        }
      })

      setTreeData(prevData => {
        const existingDriverIds = new Set(
          prevData
            .filter(node => typeof node.id === 'string' && node.id.match(/^[A-Z]:$/))
            .map(node => node.id)
        )

        const newDrivers = driverNodes.filter(driver => !existingDriverIds.has(driver.id))

        return sanitizeFileNodes([...prevData, ...newDrivers].sort((a, b) => {
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
        title: t('enumDriversSuccess'),
        description: t('enumDriversSuccessDesc', { count: driveInfos.length })
      })
    } catch (error) {
      console.error('Enumerate drivers error:', error)
      toast({
        variant: "destructive",
        title: t('enumDriversFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setEnumeratingDrivers(false)
    }
  }, [sid, isWindowsSession, enumDriversFromAPI, toast, t, setEnumeratingDrivers, setTreeData, sanitizeFileNodes])

  // Create folder
  const handleCreateFolder = useCallback(async (targetPath?: string) => {
    const pathToUse = normalizePath(targetPath || currentPath, isWindowsSession)
    if (!newFolderName.trim() || creatingFolder) return

    setCreatingFolder(true)
    try {
      const displayPath = formatPathForDisplay(pathToUse, isWindowsSession)

      toast({
        title: t('creating'),
        description: t('creatingFolder', { name: newFolderName.trim(), path: displayPath })
      })

      const folderPath = normalizePath(`${pathToUse}/${newFolderName.trim()}`, isWindowsSession)

      await mkdir(sid, folderPath)

      toast({
        title: t('folderCreateSuccess'),
        description: t('folderCreateSuccessDesc', { name: newFolderName, path: displayPath })
      })

      setShowCreateFolder(false)
      setNewFolderName('')
      setContextMenuTargetPath(null)

      const treeChildren = await loadPath(pathToUse, true)
      updateTreeNode(pathToUse, treeChildren)
      if (normalizePath(pathToUse, isWindowsSession) === normalizePath(currentDirPath, isWindowsSession)) {
        const allFiles = await loadAllFiles(currentDirPath, true)
        setCurrentDirFiles(allFiles)
      }

      triggerCacheUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('folderCreateFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setCreatingFolder(false)
    }
  }, [newFolderName, currentPath, sid, mkdir, toast, t, loadPath, loadAllFiles, updateTreeNode, isWindowsSession, creatingFolder, triggerCacheUpdate, setCreatingFolder, setShowCreateFolder, setNewFolderName, setContextMenuTargetPath, setCurrentDirFiles])

  // Create file
  const handleCreateFile = useCallback(async (targetPath?: string) => {
    const pathToUse = normalizePath(targetPath || currentPath, isWindowsSession)
    if (!newFileName.trim() || creatingFile) return

    setCreatingFile(true)
    try {
      const displayPath = formatPathForDisplay(pathToUse, isWindowsSession)

      toast({
        title: t('creating'),
        description: t('creatingFile', { fileName: newFileName.trim(), path: displayPath })
      })

      const filePath = normalizePath(`${pathToUse}/${newFileName.trim()}`, isWindowsSession)
      await touchFile(sid, filePath)

      toast({
        title: t('fileCreateSuccess'),
        description: t('fileCreateSuccessDesc', { fileName: newFileName.trim(), currentPath: displayPath })
      })

      setShowCreateFile(false)
      setNewFileName('')
      setContextMenuTargetPath(null)

      const treeChildren = await loadPath(pathToUse, true)
      updateTreeNode(pathToUse, treeChildren)
      if (normalizePath(pathToUse, isWindowsSession) === normalizePath(currentDirPath, isWindowsSession)) {
        const allFiles = await loadAllFiles(currentDirPath, true)
        setCurrentDirFiles(allFiles)
      }

      triggerCacheUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('fileCreateFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setCreatingFile(false)
    }
  }, [newFileName, currentPath, sid, touchFile, toast, t, loadPath, loadAllFiles, updateTreeNode, creatingFile, triggerCacheUpdate, isWindowsSession, setCreatingFile, setShowCreateFile, setNewFileName, setContextMenuTargetPath, setCurrentDirFiles])

  // Refresh current directory
  const handleRefreshCurrentDirectory = useCallback(async (targetPath?: unknown) => {
    const refreshTarget = typeof targetPath === 'string' && targetPath.trim()
      ? targetPath
      : currentPath
    const pathToUse = normalizePath(refreshTarget, isWindowsSession)
    setRefreshing(true)
    try {
      fileCache.current.delete(pathToUse)
      allFilesCache.current.delete(pathToUse)
      cacheTimestamps.current.delete(`tree:${pathToUse}`)
      cacheTimestamps.current.delete(`all:${pathToUse}`)

      const treeChildren = await loadPath(pathToUse, true)
      updateTreeNode(pathToUse, treeChildren)
      const allFiles = await loadAllFiles(pathToUse, true)

      if (normalizePath(pathToUse, isWindowsSession) === normalizePath(currentDirPath, isWindowsSession)) {
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
    } finally {
      setRefreshing(false)
    }
  }, [currentPath, isWindowsSession, loadPath, loadAllFiles, updateTreeNode, toast, t, triggerCacheUpdate, fileCache, allFilesCache, setRefreshing, setCurrentDirFiles])

  // Execute rename
  const executeRename = useCallback(async () => {
    if (!renameTarget || !newName.trim() || newName.trim() === renameTarget.name || renaming) return

    setRenaming(true)
    try {
      const normalizedPath = normalizePath(renameTarget.path, isWindowsSession)
      const pathParts = normalizedPath.split('/')
      pathParts[pathParts.length - 1] = newName.trim()
      const newPath = normalizePath(pathParts.join('/'), isWindowsSession)

      await mvFile(sid, normalizedPath, newPath)

      toast({
        title: t('renameSuccess'),
        description: t('renameSuccessDesc', { oldName: renameTarget.name, newName: newName.trim() })
      })

      setShowRenameDialog(false)
      setRenameTarget(null)
      setNewName('')
      const treeChildren = await loadPath(currentPath, true)
      updateTreeNode(currentPath, treeChildren)
      const allFiles = await loadAllFiles(currentPath, true)
      setCurrentDirFiles(allFiles)

      triggerCacheUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('renameFailed'),
        description: error instanceof Error ? error.message : t('unknownError')
      })
    } finally {
      setRenaming(false)
    }
  }, [renameTarget, newName, sid, mvFile, toast, t, currentPath, loadPath, loadAllFiles, updateTreeNode, isWindowsSession, renaming, triggerCacheUpdate, setRenaming, setShowRenameDialog, setRenameTarget, setNewName, setCurrentDirFiles])

  return {
    handleRename,
    handleCopy,
    handleCopyName,
    handleCopyPath,
    handleDelete,
    handleDownload,
    handleBatchDownload,
    handleBatchDelete,
    handleFileSelect,
    executeUpload,
    handleFilesDropped,
    handleSavePermissions,
    handleEnumDrivers,
    handleCreateFolder,
    handleCreateFile,
    handleRefreshCurrentDirectory,
    executeRename,
  }
}

export type FileActions = ReturnType<typeof useFileActions>
