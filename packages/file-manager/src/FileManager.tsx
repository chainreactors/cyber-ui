"use client"

import React, { useEffect, useMemo, useRef } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./ui"
import type { FileNode } from "./types"
import { formatPathForDisplay, normalizeCacheEntries, buildBoundedMapFromEntries, MAX_TREE_CACHE_DIRS, MAX_ALL_FILES_CACHE_DIRS, MAX_PERSISTED_TREE_CACHE_ENTRIES, MAX_PERSISTED_ALL_FILES_CACHE_ENTRIES, MAX_PERSISTED_CURRENT_DIR_FILES } from "./utils/file-manager-utils"
import { useDragAndDrop } from "./hooks/useDragAndDrop"
import { useFileManagerState } from "./hooks/useFileManagerState"
import { useFileActions } from "./hooks/useFileActions"
import { useFileContextMenu } from "./components/FileContextMenu"
import { useFileNodeRenderer } from "./components/FileNodeRenderer"
import { FileTree } from "./components/FileTree"
import { FileToolbar } from "./components/FileToolbar"
import { FileListView } from "./components/FileListView"
import { FileManagerDialogs } from "./components/FileManagerDialogs"
import {
  FileManagerRuntimeProvider,
  useFileManagerRuntime,
  type FileManagerAdapter,
  type FileManagerNotification,
  type FileManagerOperation,
} from "./runtime"

interface FileManagerCoreProps {
  sessionId: string
  session?: any
  onOpenTab?: (title: string, module: string, subModule?: string, component?: unknown) => void
  className?: string
  showTree?: boolean
}

const FileManagerCore: React.FC<FileManagerCoreProps> = ({
  sessionId,
  session,
  onOpenTab,
  className,
  showTree = true,
}) => {
  const { capabilities } = useFileManagerRuntime()
  const state = useFileManagerState(sessionId, session)
  const actions = useFileActions(state)
  const sanitizeFileNodesRef = useRef(state.sanitizeFileNodes)
  sanitizeFileNodesRef.current = state.sanitizeFileNodes

  const collectNodeIds = (nodes: FileNode[], ids = new Set<string>()) => {
    nodes.forEach(node => {
      ids.add(node.id)
      if (node.fullPath) ids.add(node.fullPath)
      if (node.children?.length) {
        collectNodeIds(node.children, ids)
      }
    })
    return ids
  }

  const sanitizeCacheEntries = (entries?: [string, FileNode[]][]) => {
    if (!Array.isArray(entries)) return undefined
    return entries.map(([path, nodes]) => [
      path,
      sanitizeFileNodesRef.current(Array.isArray(nodes) ? nodes : [], path)
    ] as [string, FileNode[]])
  }

  const restoreFileTreeCache = (cached: any) => {
    const treeData = sanitizeFileNodesRef.current(cached.treeData || [])
    if (!treeData.length || !cached.currentPath) return false

    const validNodeIds = collectNodeIds(treeData)
    const expandedNodes = Array.isArray(cached.expandedNodes)
      ? cached.expandedNodes.filter((id: string) => validNodeIds.has(id))
      : []

    state.setTreeData(treeData)
    state.setExpandedNodes(new Set(expandedNodes))
    state.setCurrentPath(cached.currentPath)
    state.setCurrentDirPath(cached.currentDirPath || '')
    state.setCurrentDirFiles(sanitizeFileNodesRef.current(cached.currentDirFiles || [], cached.currentDirPath || cached.currentPath).slice(0, MAX_PERSISTED_CURRENT_DIR_FILES))
    state.setViewMode((cached.viewMode as 'list' | 'grid') || 'list')
    state.setPathInputValue(cached.pathInputValue || formatPathForDisplay(cached.currentPath, state.isWindowsSession))

    const fileCacheEntries = sanitizeCacheEntries(cached.fileCacheEntries)
    const allFilesCacheEntries = sanitizeCacheEntries(cached.allFilesCacheEntries)

    if (fileCacheEntries) {
      state.fileCache.current = buildBoundedMapFromEntries(fileCacheEntries, MAX_TREE_CACHE_DIRS)
    }
    if (allFilesCacheEntries) {
      state.allFilesCache.current = buildBoundedMapFromEntries(allFilesCacheEntries, MAX_ALL_FILES_CACHE_DIRS)
    }

    return true
  }

  const buildFileTreeCacheData = (source: {
    treeData: FileNode[]
    expandedNodes: Set<string>
    currentPath: string
    currentDirPath: string
    currentDirFiles: FileNode[]
    viewMode: 'list' | 'grid'
    pathInputValue: string
  }) => {
    const treeData = sanitizeFileNodesRef.current(source.treeData)
    const validNodeIds = collectNodeIds(treeData)
    const fileCacheEntries = sanitizeCacheEntries(normalizeCacheEntries(
      Array.from(state.fileCache.current.entries()),
      MAX_PERSISTED_TREE_CACHE_ENTRIES
    ))
    const allFilesCacheEntries = sanitizeCacheEntries(normalizeCacheEntries(
      Array.from(state.allFilesCache.current.entries()),
      MAX_PERSISTED_ALL_FILES_CACHE_ENTRIES
    ))

    return {
      treeData,
      expandedNodes: Array.from(source.expandedNodes).filter(id => validNodeIds.has(id)),
      currentPath: source.currentPath,
      currentDirPath: source.currentDirPath,
      currentDirFiles: sanitizeFileNodesRef.current(source.currentDirFiles, source.currentDirPath || source.currentPath).slice(0, MAX_PERSISTED_CURRENT_DIR_FILES),
      viewMode: source.viewMode,
      pathInputValue: source.pathInputValue,
      fileCacheEntries,
      allFilesCacheEntries,
      lastSaved: Date.now(),
    }
  }

  // Drag and drop
  const { isDragging, dragHandlers } = useDragAndDrop({
    onFilesDropped: actions.handleFilesDropped,
  })

  // Context menus
  const { generateDirectoryContextMenu, generateContextMenu } = useFileContextMenu({
    isWindowsSession: state.isWindowsSession,
    onOpenTab,
    sessionId,
    navigateToPath: state.navigateToPath,
    handleRefreshCurrentDirectory: actions.handleRefreshCurrentDirectory,
    handleDownload: actions.handleDownload,
    handleRename: actions.handleRename,
    handleCopy: actions.handleCopy,
    handleCopyName: actions.handleCopyName,
    handleCopyPath: actions.handleCopyPath,
    handleDelete: actions.handleDelete,
    setContextMenuTargetPath: state.setContextMenuTargetPath,
    setShowCreateFolder: state.setShowCreateFolder,
    setShowCreateFile: state.setShowCreateFile,
    setShowUploadDialog: state.setShowUploadDialog,
    setUploadTargetPath: state.setUploadTargetPath,
    setSelectedUploadFile: state.setSelectedUploadFile,
    setSelectedPropertyFile: state.setSelectedPropertyFile,
    setShowProperties: state.setShowProperties,
    setSelectedPermissionFile: state.setSelectedPermissionFile,
    setShowPermissionEditor: state.setShowPermissionEditor,
    setFileSizeWarning: state.setFileSizeWarning,
    setSelectedFile: state.setSelectedFile,
  })

  // File node renderer
  const FileNodeRenderer = useFileNodeRenderer({
    loadingNodes: state.loadingNodes,
    currentDirPath: state.currentDirPath,
    operatingFiles: state.operatingFiles,
    navigateToPath: state.navigateToPath,
    generateContextMenu,
    matchedNodeIds: state.matchedNodeIds,
    treeSearchQuery: state.treeSearchQuery,
  })

  // Auto-expand matched nodes
  useEffect(() => {
    if (!state.treeRef.current || !state.treeSearchQuery.trim()) return

    const expandMatchedParents = (nodes: FileNode[]) => {
      nodes.forEach((node: FileNode & { _isMatched?: boolean }) => {
        if (node._isMatched || (node.children && node.children.length > 0)) {
          state.treeRef.current?.open(node.id)
          if (node.children) {
            expandMatchedParents(node.children)
          }
        }
      })
    }

    expandMatchedParents(state.filteredTreeData)
  }, [state.treeSearchQuery, state.filteredTreeData, state.treeRef])

  // Keyboard shortcuts
  useHotkeys('ctrl+a', (e) => {
    e.preventDefault()
    const allIds = new Set(state.currentDirFiles.map(f => f.id))
    state.setSelection({ selectedIds: allIds, lastSelectedId: null, selectRange: false })
  }, { enableOnFormTags: true })

  useHotkeys('delete', () => {
    if (state.selection.selectedIds.size > 0) {
      actions.handleBatchDelete()
    }
  }, [state.selection.selectedIds, actions.handleBatchDelete])

  useHotkeys('ctrl+r', () => {
    state.initializeFileSystem()
  }, [state.initializeFileSystem])

  // ESC key to close file preview (only when no dialog is open)
  useHotkeys('escape', (e) => {
    if (state.fileSizeWarning || state.showCreateFolder || state.showCreateFile || state.showRenameDialog || state.showUploadDialog) {
      return
    }
    if (state.selectedFile) {
      e.preventDefault()
      state.setSelectedFile(null)
    }
  }, { enabled: !state.fileSizeWarning && !state.showCreateFolder && !state.showCreateFile && !state.showRenameDialog && !state.showUploadDialog })

  // Initialize - wait for session to be loaded, only once
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (sessionId && session && !hasInitialized.current) {
      hasInitialized.current = true

      // Fast path: check memory cache (synchronous)
      const cached = state.getFileTreeCache(sessionId)
      if (cached && cached.treeData && cached.treeData.length > 0 && cached.currentPath) {
        restoreFileTreeCache(cached)
      } else {
        // Slow path: try IndexedDB -> server -> fresh RPC (async)
        state.loadFileTreeCache(sessionId).then((lowerCached) => {
          if (lowerCached && lowerCached.treeData && lowerCached.treeData.length > 0 && lowerCached.currentPath) {
            if (!restoreFileTreeCache(lowerCached)) {
              state.initializeFileSystem()
            }
          } else {
            state.initializeFileSystem()
          }
        })
      }
    }
  }, [sessionId, session])

  // Debounced cache write effect
  useEffect(() => {
    if (!state.shouldUpdateCache || !sessionId) return
    state.setShouldUpdateCache(false)

    state.setFileTreeCache(sessionId, buildFileTreeCacheData({
      treeData: state.treeData,
      expandedNodes: state.expandedNodes,
      currentPath: state.currentPath,
      currentDirPath: state.currentDirPath,
      currentDirFiles: state.currentDirFiles,
      viewMode: state.viewMode,
      pathInputValue: state.pathInputValue,
    }))
  }, [state.shouldUpdateCache, sessionId, state.treeData, state.expandedNodes, state.currentPath, state.currentDirPath, state.currentDirFiles, state.viewMode, state.pathInputValue, state.setFileTreeCache])

  // Refs to hold latest state for unmount cleanup (avoids stale closure)
  const stateRef = useRef({ treeData: state.treeData, expandedNodes: state.expandedNodes, currentPath: state.currentPath, currentDirPath: state.currentDirPath, currentDirFiles: state.currentDirFiles, viewMode: state.viewMode, pathInputValue: state.pathInputValue })
  const setFileTreeCacheRef = useRef(state.setFileTreeCache)
  setFileTreeCacheRef.current = state.setFileTreeCache
  const flushFileTreeCacheRef = useRef(state.flushFileTreeCache)
  flushFileTreeCacheRef.current = state.flushFileTreeCache

  useEffect(() => {
    stateRef.current = { treeData: state.treeData, expandedNodes: state.expandedNodes, currentPath: state.currentPath, currentDirPath: state.currentDirPath, currentDirFiles: state.currentDirFiles, viewMode: state.viewMode, pathInputValue: state.pathInputValue }
  })

  // Save to cache on unmount
  useEffect(() => {
    return () => {
      const s = stateRef.current
      if (s.treeData.length > 0 && sessionId) {
        const cacheData = buildFileTreeCacheData({
          treeData: s.treeData,
          expandedNodes: s.expandedNodes,
          currentPath: s.currentPath,
          currentDirPath: s.currentDirPath,
          currentDirFiles: s.currentDirFiles,
          viewMode: s.viewMode,
          pathInputValue: s.pathInputValue,
        })
        setFileTreeCacheRef.current(sessionId, cacheData)
        flushFileTreeCacheRef.current(sessionId)
      }
    }
  }, [sessionId])

  // Trigger cache update when viewMode changes
  useEffect(() => {
    if (hasInitialized.current) {
      state.triggerCacheUpdate()
    }
  }, [state.viewMode, state.triggerCacheUpdate])

  // Ensure nodes are expanded when expandedNodes or treeData changes
  useEffect(() => {
    if (state.expandedNodes.size === 0 || !state.treeRef.current) return

    const expandNodes = () => {
      state.expandedNodes.forEach(id => {
        const node = state.treeRef.current?.get(id)
        if (node && !node.isOpen) {
          node.open()
        }
      })
    }

    const timeouts = [
      setTimeout(expandNodes, 0),
      setTimeout(expandNodes, 50),
      setTimeout(expandNodes, 150)
    ]

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [state.expandedNodes, state.treeData])

  return (
    <div className={`h-full flex flex-col file-manager-container ${className}`}>
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {showTree && !state.isMobile ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={22} minSize={15} maxSize={40}>
              <FileTree
                treeRef={state.treeRef}
                filteredTreeData={state.filteredTreeData}
                treeData={state.treeData}
                expandedNodes={state.expandedNodes}
                selection={state.selection}
                treeWidth={state.treeWidth}
                treeHeight={state.treeHeight}
                treeContainerRef={state.treeContainerRef}
                treeSearchQuery={state.treeSearchQuery}
                setTreeSearchQuery={state.setTreeSearchQuery}
                matchedCount={state.matchedCount}
                rpcError={state.rpcError}
                isWindowsSession={state.isWindowsSession}
                isMobile={state.isMobile}
                initializeFileSystem={state.initializeFileSystem}
                handleNodeSelect={state.handleNodeSelect}
                handleTreeToggle={state.handleTreeToggle}
                FileNodeRenderer={FileNodeRenderer}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={78}>
              <div className="h-full flex flex-col min-w-0">
                <FileToolbar
                  isMobile={state.isMobile}
                  isWindowsSession={state.isWindowsSession}
                  currentPath={state.currentPath}
                  currentDirPath={state.currentDirPath}
                  pathInputValue={state.pathInputValue}
                  isEditingPath={state.isEditingPath}
                  viewMode={state.viewMode}
                  selection={state.selection}
                  refreshing={state.refreshing}
                  uploading={state.uploading}
                  downloading={state.downloading}
                  deleting={state.deleting}
                  enumeratingDrivers={state.enumeratingDrivers}
                  isAtRoot={state.isAtRoot}
                  cacheMode={state.cacheMode}
                  navigateToPath={state.navigateToPath}
                  navigateUp={state.navigateUp}
                  navigateHome={state.navigateHome}
                  handleRefresh={actions.handleRefreshCurrentDirectory}
                  setPathInputValue={state.setPathInputValue}
                  setIsEditingPath={state.setIsEditingPath}
                  setViewMode={state.setViewMode}
                  setCacheMode={state.setCacheMode}
                  setShowCreateFolder={state.setShowCreateFolder}
                  setShowCreateFile={state.setShowCreateFile}
                  setShowUploadDialog={state.setShowUploadDialog}
                  setContextMenuTargetPath={state.setContextMenuTargetPath}
                  setUploadTargetPath={state.setUploadTargetPath}
                  setSelectedUploadFile={state.setSelectedUploadFile}
                  handleBatchDownload={actions.handleBatchDownload}
                  handleBatchDelete={actions.handleBatchDelete}
                  handleEnumDrivers={actions.handleEnumDrivers}
                  treeRef={state.treeRef}
                  filteredTreeData={state.filteredTreeData}
                  treeData={state.treeData}
                  treeHeight={state.treeHeight}
                  treeSearchQuery={state.treeSearchQuery}
                  setTreeSearchQuery={state.setTreeSearchQuery}
                  matchedCount={state.matchedCount}
                  rpcError={state.rpcError}
                  FileNodeRenderer={FileNodeRenderer}
                />

                <FileListView
                  currentDirFiles={state.currentDirFiles}
                  currentDirPath={state.currentDirPath}
                  visibleFiles={state.visibleFiles}
                  selectedFile={state.selectedFile}
                  viewMode={state.viewMode}
                  sortKey={state.sortKey}
                  sortDirection={state.sortDirection}
                  isDragging={isDragging}
                  dragHandlers={dragHandlers}
                  handleFileListScroll={state.handleFileListScroll}
                  handleSort={state.handleSort}
                  navigateToPath={state.navigateToPath}
                  setSelectedFile={state.setSelectedFile}
                  setFileSizeWarning={state.setFileSizeWarning}
                  generateDirectoryContextMenu={generateDirectoryContextMenu}
                  generateContextMenu={generateContextMenu}
                  selectedIds={state.selection.selectedIds}
                  onFileSelect={state.handleFileListSelect}
                  onBatchDownload={capabilities.download ? actions.handleBatchDownload : undefined}
                  onBatchDelete={capabilities.remove ? actions.handleBatchDelete : undefined}
                  onClearSelection={() => state.setSelection({ selectedIds: new Set(), lastSelectedId: null, selectRange: false })}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex-1 flex flex-col min-w-0">
            <FileToolbar
              isMobile={state.isMobile}
              isWindowsSession={state.isWindowsSession}
              currentPath={state.currentPath}
              currentDirPath={state.currentDirPath}
              pathInputValue={state.pathInputValue}
              isEditingPath={state.isEditingPath}
              viewMode={state.viewMode}
              selection={state.selection}
              refreshing={state.refreshing}
              uploading={state.uploading}
              downloading={state.downloading}
              deleting={state.deleting}
              enumeratingDrivers={state.enumeratingDrivers}
              isAtRoot={state.isAtRoot}
              cacheMode={state.cacheMode}
              navigateToPath={state.navigateToPath}
              navigateUp={state.navigateUp}
              navigateHome={state.navigateHome}
              handleRefresh={actions.handleRefreshCurrentDirectory}
              setPathInputValue={state.setPathInputValue}
              setIsEditingPath={state.setIsEditingPath}
              setViewMode={state.setViewMode}
              setCacheMode={state.setCacheMode}
              setShowCreateFolder={state.setShowCreateFolder}
              setShowCreateFile={state.setShowCreateFile}
              setShowUploadDialog={state.setShowUploadDialog}
              setContextMenuTargetPath={state.setContextMenuTargetPath}
              setUploadTargetPath={state.setUploadTargetPath}
              setSelectedUploadFile={state.setSelectedUploadFile}
              handleBatchDownload={actions.handleBatchDownload}
              handleBatchDelete={actions.handleBatchDelete}
              handleEnumDrivers={actions.handleEnumDrivers}
              treeRef={state.treeRef}
              filteredTreeData={state.filteredTreeData}
              treeData={state.treeData}
              treeHeight={state.treeHeight}
              treeSearchQuery={state.treeSearchQuery}
              setTreeSearchQuery={state.setTreeSearchQuery}
              matchedCount={state.matchedCount}
              rpcError={state.rpcError}
              FileNodeRenderer={FileNodeRenderer}
            />

            <FileListView
              currentDirFiles={state.currentDirFiles}
              currentDirPath={state.currentDirPath}
              visibleFiles={state.visibleFiles}
              selectedFile={state.selectedFile}
              viewMode={state.viewMode}
              sortKey={state.sortKey}
              sortDirection={state.sortDirection}
              isDragging={isDragging}
              dragHandlers={dragHandlers}
              handleFileListScroll={state.handleFileListScroll}
              handleSort={state.handleSort}
              navigateToPath={state.navigateToPath}
              setSelectedFile={state.setSelectedFile}
              setFileSizeWarning={state.setFileSizeWarning}
              generateDirectoryContextMenu={generateDirectoryContextMenu}
              generateContextMenu={generateContextMenu}
              selectedIds={state.selection.selectedIds}
              onFileSelect={state.handleFileListSelect}
              onBatchDownload={capabilities.download ? actions.handleBatchDownload : undefined}
              onBatchDelete={capabilities.remove ? actions.handleBatchDelete : undefined}
              onClearSelection={() => state.setSelection({ selectedIds: new Set(), lastSelectedId: null, selectRange: false })}
            />
          </div>
        )}
      </div>

      <FileManagerDialogs
        sessionId={sessionId}
        isWindowsSession={state.isWindowsSession}
        selectedFile={state.selectedFile}
        setSelectedFile={state.setSelectedFile}
        fileInputRef={state.fileInputRef}
        handleFileSelect={actions.handleFileSelect}
        showCreateFolder={state.showCreateFolder}
        setShowCreateFolder={state.setShowCreateFolder}
        newFolderName={state.newFolderName}
        setNewFolderName={state.setNewFolderName}
        creatingFolder={state.creatingFolder}
        handleCreateFolder={actions.handleCreateFolder}
        contextMenuTargetPath={state.contextMenuTargetPath}
        setContextMenuTargetPath={state.setContextMenuTargetPath}
        showCreateFile={state.showCreateFile}
        setShowCreateFile={state.setShowCreateFile}
        newFileName={state.newFileName}
        setNewFileName={state.setNewFileName}
        creatingFile={state.creatingFile}
        handleCreateFile={actions.handleCreateFile}
        showRenameDialog={state.showRenameDialog}
        setShowRenameDialog={state.setShowRenameDialog}
        renameTarget={state.renameTarget}
        setRenameTarget={state.setRenameTarget}
        newName={state.newName}
        setNewName={state.setNewName}
        renaming={state.renaming}
        executeRename={actions.executeRename}
        showUploadDialog={state.showUploadDialog}
        setShowUploadDialog={state.setShowUploadDialog}
        selectedUploadFile={state.selectedUploadFile}
        setSelectedUploadFile={state.setSelectedUploadFile}
        uploadTargetPath={state.uploadTargetPath}
        setUploadTargetPath={state.setUploadTargetPath}
        uploading={state.uploading}
        executeUpload={actions.executeUpload}
        fileSizeWarning={state.fileSizeWarning}
        setFileSizeWarning={state.setFileSizeWarning}
        showUploadProgress={state.showUploadProgress}
        setShowUploadProgress={state.setShowUploadProgress}
        uploadQueue={state.uploadQueue}
        setUploadQueue={state.setUploadQueue}
        showDownloadProgress={state.showDownloadProgress}
        setShowDownloadProgress={state.setShowDownloadProgress}
        downloadQueue={state.downloadQueue}
        setDownloadQueue={state.setDownloadQueue}
        showProperties={state.showProperties}
        setShowProperties={state.setShowProperties}
        selectedPropertyFile={state.selectedPropertyFile}
        showPermissionEditor={state.showPermissionEditor}
        setShowPermissionEditor={state.setShowPermissionEditor}
        selectedPermissionFile={state.selectedPermissionFile}
        handleSavePermissions={actions.handleSavePermissions}
      />
    </div>
  )
}

export interface FileManagerProps {
  adapter: FileManagerAdapter
  className?: string
  historyKey?: string
  initialPath?: string
  isWindows?: boolean
  maxHistory?: number
  messages?: Record<string, string>
  notify?: (notification: FileManagerNotification) => void
  onOpenFile?: (entry: FileNode) => void
  onOperationError?: (operation: FileManagerOperation, error: unknown) => void
  onOperationSuccess?: (operation: Exclude<FileManagerOperation, 'list' | 'roots'>, entries: FileNode[]) => void
  renderPreview?: (entry: FileNode) => React.ReactNode
  showTree?: boolean
  sourceKey?: string | number
  translate?: (key: string, values?: Record<string, unknown>) => string
}

export function FileManager({
  adapter,
  className,
  historyKey,
  initialPath: initialPathInput = '',
  isWindows: isWindowsInput,
  maxHistory = 12,
  messages,
  notify = () => undefined,
  onOpenFile,
  onOperationError,
  onOperationSuccess,
  renderPreview,
  showTree = true,
  sourceKey = 'default',
  translate: translateInput,
}: FileManagerProps) {
  const isWindows = isWindowsInput ?? /^[A-Za-z]:[\\/]|^\\\\|^\/\//.test(initialPathInput)
  const initialPath = initialPathInput || (isWindows ? 'C:' : '/')
  const resolvedSourceKey = String(sourceKey)
  const translate = useMemo(() => translateInput ?? ((key: string, values?: Record<string, unknown>) => {
    const template = messages?.[key] || DEFAULT_MESSAGES[key] || key
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(values?.[name] ?? `{${name}}`))
  }), [messages, translateInput])
  const runtime = useMemo(() => ({
    adapter,
    capabilities: {
      roots: !!adapter.roots,
      mkdir: !!adapter.mkdir,
      createFile: !!adapter.createFile,
      upload: !!adapter.upload,
      download: !!(adapter.download || adapter.downloadUrl),
      remove: !!adapter.remove,
      rename: !!adapter.rename,
      copy: !!adapter.copy,
      chmod: !!adapter.chmod,
      preview: !!(onOpenFile || renderPreview || adapter.readFile),
    },
    initialPath,
    historyKey: historyKey || `cyber.fileManager.history.${resolvedSourceKey}`,
    maxHistory,
    notify,
    onOpenFile,
    onOperationError,
    onOperationSuccess,
    renderPreview,
    sourceKey: resolvedSourceKey,
    translate,
  }), [adapter, historyKey, initialPath, maxHistory, notify, onOpenFile, onOperationError, onOperationSuccess, renderPreview, resolvedSourceKey, translate])

  return (
    <FileManagerRuntimeProvider value={runtime}>
      <FileManagerCore
        sessionId={resolvedSourceKey}
        session={{ workdir: initialPath, type: isWindows ? 'windows' : 'unix' }}
        className={className}
        showTree={showTree}
      />
    </FileManagerRuntimeProvider>
  )
}

const DEFAULT_MESSAGES: Record<string, string> = {
  loading: 'Loading…',
  emptyDirectory: 'This directory is empty',
  createFolder: 'Create folder',
  createFile: 'Create file',
  newFolder: 'New folder',
  newFile: 'New file',
  folderName: 'Folder name',
  fileName: 'File name',
  upload: 'Upload',
  download: 'Download',
  rename: 'Rename',
  copy: 'Copy',
  copyName: 'Copy name',
  copyPath: 'Copy path',
  delete: 'Delete',
  refresh: 'Refresh',
  open: 'Open',
  openInNewTab: 'Open in new tab',
  operations: 'Operations',
  directoryOperations: 'Directory operations',
  copyOperations: 'Copy',
  dangerZone: 'Danger zone',
  fileDetails: 'Details',
  name: 'Name',
  size: 'Size',
  time: 'Modified',
  mode: 'Mode',
  selectFile: 'Select file',
  changeFile: 'Change file',
  targetPath: 'Target path',
  optional: 'optional',
  targetPathPlaceholder: 'Leave empty to keep the original name',
  uploading: 'Uploading…',
  dragDropHint: 'Drop files here to upload',
  selectedCount: '{count} selected',
  searchFiles: 'Search files',
  goHome: 'Home',
  goUp: 'Up one level',
  cachedMode: 'Cached mode',
  liveMode: 'Live mode',
  editPath: 'Edit path',
  pathInput: 'Path',
  recentPaths: 'Recent paths',
  listView: 'List view',
  gridView: 'Grid view',
  enumDrivers: 'List drives',
  currentSystem: 'System: {system}',
  system: 'System',
  unixSystem: 'Unix/Linux',
  windowsSystem: 'Windows',
  properties: 'Properties',
  'properties.title': 'Properties',
  'properties.link': 'Link',
  'permissions.edit': 'Edit permissions',
  create: 'Create',
  newName: 'New name',
  currentName: 'Current name',
  renameFile: 'Rename file',
  renaming: 'Renaming…',
  creating: 'Creating…',
  creatingFolder: 'Creating {name} in {path}',
  creatingFile: 'Creating {fileName} in {path}',
  folderCreateSuccess: 'Folder created',
  folderCreateSuccessDesc: '{name} was created in {path}',
  folderCreateFailed: 'Failed to create folder',
  fileCreateSuccess: 'File created',
  fileCreateSuccessDesc: '{fileName} was created in {currentPath}',
  fileCreateFailed: 'Failed to create file',
  renameSuccess: 'Renamed',
  renameSuccessDesc: '{oldName} is now {newName}',
  renameFailed: 'Rename failed',
  deleteSuccess: 'Deleted',
  deleteSuccessDesc: '{filename} was deleted',
  deleteFailed: 'Delete failed',
  copySuccess: 'Copied',
  copySuccessDesc: 'Created a copy of {filename}',
  copyNameSuccessDesc: 'Copied {name}',
  copyPathSuccessDesc: 'Copied {path}',
  copyFailed: 'Copy failed',
  refreshSuccess: 'Refreshed',
  refreshSuccessDesc: 'Directory contents are up to date',
  refreshFailed: 'Refresh failed',
  navigationFailed: 'Could not open path',
  uploadSuccess: 'Upload complete',
  uploadSuccessDesc: '{filename} was uploaded to {path}',
  uploadFailed: 'Upload failed',
  uploadingTo: 'Uploading {filename} to {path}',
  noResults: 'No matching files',
  searchResults: '{count} matches',
  'common.retry': 'Retry',
  'common.save': 'Save',
  unknownError: 'Unknown error',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
}
