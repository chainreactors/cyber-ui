"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./ui"
import type { FileNode } from "./types"
import {
  createLocalStorageFileManagerCache,
  createMemoryFileManagerCache,
  type FileManagerCacheAdapter,
} from "./cache"
import type {
  FileAction,
  FileActionContext,
  FileEntry,
  FileManagerAdapter,
  FileManagerEvent,
  FileManagerMutation,
  FileManagerOperation,
  FileManagerSlots,
} from "./contracts"
import {
  createFileManagerTranslator,
  type FileManagerLocale,
  type FileManagerMessages,
} from "./messages"
import { FileManagerRequestManager } from "./request-manager"
import { formatPathForDisplay, normalizeCacheEntries, buildBoundedMapFromEntries, filterDirectoryTree, MAX_TREE_CACHE_DIRS, MAX_ALL_FILES_CACHE_DIRS, MAX_PERSISTED_TREE_CACHE_ENTRIES, MAX_PERSISTED_ALL_FILES_CACHE_ENTRIES, MAX_PERSISTED_CURRENT_DIR_FILES } from "./utils/file-manager-utils"
import { useDragAndDrop } from "./hooks/useDragAndDrop"
import { useFileManagerState } from "./hooks/useFileManagerState"
import { isCompactFileManagerWidth, useResizeObserver } from "./hooks/useResizeObserver"
import { useFileActions } from "./hooks/useFileActions"
import { useFileContextMenu } from "./components/FileContextMenu"
import { useFileNodeRenderer } from "./components/FileNodeRenderer"
import { FileTree } from "./components/FileTree"
import { FileToolbar } from "./components/FileToolbar"
import { FileListView } from "./components/FileListView"
import { FileManagerDialogs } from "./components/FileManagerDialogs"
import {
  FileManagerRuntimeProvider,
  fileNodeToEntry,
  useFileManagerRuntime,
  type FileManagerNotification,
} from "./runtime"

type FileManagerTranslate = (
  key: string,
  values?: Record<string, unknown>,
) => string

function isUnresolvedTranslationKey(key: string, translated: string): boolean {
  return translated === key || (
    translated.endsWith(`.${key}`) &&
    /^[A-Za-z0-9_.-]+$/.test(translated)
  )
}

export function createFileManagerRuntimeTranslator({
  locale,
  messages,
  translate,
}: {
  locale: FileManagerLocale
  messages?: Partial<FileManagerMessages>
  translate?: FileManagerTranslate
}): FileManagerTranslate {
  const fallback = createFileManagerTranslator({ locale, messages })
  if (!translate) return fallback

  return (key: string, values?: Record<string, unknown>) => {
    try {
      const translated = translate(key, values)
      return translated && !isUnresolvedTranslationKey(key, translated)
        ? translated
        : fallback(key, values)
    } catch {
      return fallback(key, values)
    }
  }
}

interface FileManagerCoreProps {
  className?: string
  initialPath: string
  pathStyle: 'posix' | 'windows'
  scopeKey: string
  showTree?: boolean
}

const FileManagerCore: React.FC<FileManagerCoreProps> = ({
  className,
  initialPath,
  pathStyle,
  scopeKey,
  showTree = true,
}) => {
  const { capabilities } = useFileManagerRuntime()
  const { ref: containerRef, width: containerWidth } = useResizeObserver()
  const isCompact = isCompactFileManagerWidth(containerWidth)
  const [compactTreeOpen, setCompactTreeOpen] = useState(false)
  const state = useFileManagerState(scopeKey, initialPath, pathStyle, isCompact)
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

  const sanitizeCacheEntries = (entries?: [string, FileNode[]][], directoriesOnly = false) => {
    if (!Array.isArray(entries)) return undefined
    return entries.map(([path, nodes]) => [
      path,
      directoriesOnly
        ? filterDirectoryTree(sanitizeFileNodesRef.current(Array.isArray(nodes) ? nodes : [], path))
        : sanitizeFileNodesRef.current(Array.isArray(nodes) ? nodes : [], path)
    ] as [string, FileNode[]])
  }

  const restoreFileTreeCache = (cached: any) => {
    const treeData = filterDirectoryTree(sanitizeFileNodesRef.current(cached.treeData || []))
    if (!treeData.length || !cached.currentPath) return false

    const validNodeIds = collectNodeIds(treeData)
    const expandedNodes = Array.isArray(cached.expandedNodes)
      ? cached.expandedNodes.filter((id: string) => validNodeIds.has(id))
      : []

    state.replaceTree(treeData)
    state.setExpandedNodes(new Set(expandedNodes))
    state.setCurrentPath(cached.currentPath)
    state.setCurrentDirPath(cached.currentDirPath || '')
    state.setCurrentDirFiles(sanitizeFileNodesRef.current(cached.currentDirFiles || [], cached.currentDirPath || cached.currentPath).slice(0, MAX_PERSISTED_CURRENT_DIR_FILES))
    state.setViewMode((cached.viewMode as 'list' | 'grid') || 'list')
    state.setPathInputValue(cached.pathInputValue || formatPathForDisplay(cached.currentPath, state.usesWindowsPaths))

    const fileCacheEntries = sanitizeCacheEntries(cached.fileCacheEntries, true)
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
    const treeData = filterDirectoryTree(sanitizeFileNodesRef.current(source.treeData))
    const validNodeIds = collectNodeIds(treeData)
    const fileCacheEntries = sanitizeCacheEntries(normalizeCacheEntries(
      Array.from(state.fileCache.current.entries()),
      MAX_PERSISTED_TREE_CACHE_ENTRIES
    ), true)
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
    usesWindowsPaths: state.usesWindowsPaths,
    currentPath: state.currentPath,
    navigateToPath: state.navigateToPath,
    handleRefreshCurrentDirectory: actions.handleRefreshCurrentDirectory,
    handleDownload: actions.handleDownload,
    handleRename: actions.handleRename,
    handleCopy: actions.handleCopy,
    handleCopyName: actions.handleCopyName,
    handleCopyPath: actions.handleCopyPath,
    handleDelete: actions.handleDelete,
    pendingMutationPaths: state.pendingMutationPaths,
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

  const operatingFiles = useMemo(() => new Set([
    ...state.operatingFiles,
    ...state.pendingMutationPaths,
  ]), [state.operatingFiles, state.pendingMutationPaths])

  // File node renderer
  const FileNodeRenderer = useFileNodeRenderer({
    loadingNodes: state.loadingNodes,
    currentDirPath: state.currentDirPath,
    operatingFiles,
    navigateToPath: state.navigateToPath,
    generateContextMenu,
    matchedNodeIds: state.matchedNodeIds,
    treeSearchQuery: state.treeSearchQuery,
    onDirectoryNavigate: () => setCompactTreeOpen(false),
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

  // Initialize once per mounted scope.
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (scopeKey && !hasInitialized.current) {
      hasInitialized.current = true

      // Fast path: check memory cache (synchronous)
      const cached = state.getFileTreeCache()
      if (cached && cached.treeData && cached.treeData.length > 0 && cached.currentPath) {
        restoreFileTreeCache(cached)
      } else {
        // Slow path: try the injected cache before loading fresh data.
        state.loadFileTreeCache().then((lowerCached) => {
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
  }, [scopeKey])

  // Debounced cache write effect
  useEffect(() => {
    if (!state.shouldUpdateCache || !scopeKey) return
    state.setShouldUpdateCache(false)

    state.setFileTreeCache(buildFileTreeCacheData({
      treeData: state.treeData,
      expandedNodes: state.expandedNodes,
      currentPath: state.currentPath,
      currentDirPath: state.currentDirPath,
      currentDirFiles: state.currentDirFiles,
      viewMode: state.viewMode,
      pathInputValue: state.pathInputValue,
    }))
  }, [state.shouldUpdateCache, scopeKey, state.treeData, state.expandedNodes, state.currentPath, state.currentDirPath, state.currentDirFiles, state.viewMode, state.pathInputValue, state.setFileTreeCache])

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
      if (s.treeData.length > 0 && scopeKey) {
        const cacheData = buildFileTreeCacheData({
          treeData: s.treeData,
          expandedNodes: s.expandedNodes,
          currentPath: s.currentPath,
          currentDirPath: s.currentDirPath,
          currentDirFiles: s.currentDirFiles,
          viewMode: s.viewMode,
          pathInputValue: s.pathInputValue,
        })
        setFileTreeCacheRef.current(cacheData)
        flushFileTreeCacheRef.current()
      }
    }
  }, [scopeKey])

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
    <div
      className={`relative isolate h-full overflow-hidden flex flex-col file-manager-container ${className || ''}`}
      data-cyber-file-manager=""
      data-path-style={pathStyle}
      data-layout={isCompact ? 'compact' : 'wide'}
      ref={containerRef}
    >
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
                fileSystemError={state.fileSystemError}
                usesWindowsPaths={state.usesWindowsPaths}
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
                  usesWindowsPaths={state.usesWindowsPaths}
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
                  loadingRoots={state.loadingRoots}
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
                  handleLoadRoots={actions.handleLoadRoots}
                  treeRef={state.treeRef}
                  filteredTreeData={state.filteredTreeData}
                  treeData={state.treeData}
                  expandedNodes={state.expandedNodes}
                  treeSearchQuery={state.treeSearchQuery}
                  setTreeSearchQuery={state.setTreeSearchQuery}
                  matchedCount={state.matchedCount}
                  fileSystemError={state.fileSystemError}
                  FileNodeRenderer={FileNodeRenderer}
                  handleNodeSelect={state.handleNodeSelect}
                  handleTreeToggle={state.handleTreeToggle}
                  treeOpen={compactTreeOpen}
                  setTreeOpen={setCompactTreeOpen}
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
                  operatingFiles={operatingFiles}
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
              usesWindowsPaths={state.usesWindowsPaths}
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
              loadingRoots={state.loadingRoots}
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
              handleLoadRoots={actions.handleLoadRoots}
              treeRef={state.treeRef}
              filteredTreeData={state.filteredTreeData}
              treeData={state.treeData}
              expandedNodes={state.expandedNodes}
              treeSearchQuery={state.treeSearchQuery}
              setTreeSearchQuery={state.setTreeSearchQuery}
              matchedCount={state.matchedCount}
              fileSystemError={state.fileSystemError}
              FileNodeRenderer={FileNodeRenderer}
              handleNodeSelect={state.handleNodeSelect}
              handleTreeToggle={state.handleTreeToggle}
              treeOpen={compactTreeOpen}
              setTreeOpen={setCompactTreeOpen}
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
              operatingFiles={operatingFiles}
              onFileSelect={state.handleFileListSelect}
              onBatchDownload={capabilities.download ? actions.handleBatchDownload : undefined}
              onBatchDelete={capabilities.remove ? actions.handleBatchDelete : undefined}
              onClearSelection={() => state.setSelection({ selectedIds: new Set(), lastSelectedId: null, selectRange: false })}
            />
          </div>
        )}
      </div>

      <FileManagerDialogs
        usesWindowsPaths={state.usesWindowsPaths}
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
        cancelUploads={actions.cancelUploads}
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
  cache?: FileManagerCacheAdapter | false
  className?: string
  getActions?: (context: FileActionContext) => FileAction[]
  historyKey?: string
  initialPath?: string
  locale?: FileManagerLocale
  maxHistory?: number
  messages?: Partial<FileManagerMessages>
  notify?: (notification: FileManagerNotification) => void
  onEvent?: (event: FileManagerEvent) => void
  onOpenFile?: (entry: FileEntry) => void
  onOperationError?: (operation: FileManagerOperation, error: unknown) => void
  onOperationSuccess?: (operation: FileManagerMutation, entries: FileEntry[]) => void
  renderPreview?: (entry: FileEntry) => React.ReactNode
  scopeKey?: string
  showTree?: boolean
  slots?: FileManagerSlots
  /** @deprecated Use scopeKey. */
  sourceKey?: string | number
  translate?: (key: string, values?: Record<string, unknown>) => string
}

export function FileManager({
  adapter,
  cache,
  className,
  getActions,
  historyKey,
  initialPath: initialPathInput = '',
  locale = 'en',
  maxHistory = 12,
  messages,
  notify = () => undefined,
  onEvent,
  onOpenFile,
  onOperationError,
  onOperationSuccess,
  renderPreview,
  scopeKey,
  showTree = true,
  slots,
  sourceKey = 'default',
  translate: translateInput,
}: FileManagerProps) {
  const initialPath = initialPathInput || (adapter.pathStyle === 'windows' ? 'C:/' : '/')
  const resolvedScopeKey = scopeKey || String(sourceKey)
  const resolvedCache = useMemo<FileManagerCacheAdapter | false>(() => {
    if (cache === false) return false
    if (cache) return cache
    if (typeof window === 'undefined') return createMemoryFileManagerCache()
    return createLocalStorageFileManagerCache()
  }, [cache])
  const requestManager = useMemo(
    () => new FileManagerRequestManager(),
    [adapter, resolvedScopeKey],
  )
  useEffect(() => () => requestManager.abortAll(), [requestManager])
  const translate = useMemo(
    () => createFileManagerRuntimeTranslator({
      locale,
      messages,
      translate: translateInput,
    }),
    [locale, messages, translateInput],
  )
  const preview = slots?.preview ?? renderPreview
  const runtime = useMemo(() => ({
    adapter,
    cache: resolvedCache,
    capabilities: {
      roots: !!adapter.roots,
      mkdir: !!adapter.createDirectory,
      createFile: !!adapter.createFile,
      upload: !!adapter.upload,
      download: !!(adapter.download || adapter.downloadUrl),
      remove: !!adapter.remove,
      rename: !!adapter.rename,
      copy: !!adapter.copy,
      chmod: !!adapter.chmod,
      preview: !!(onOpenFile || preview),
    },
    getActions,
    initialPath,
    historyKey: historyKey || `cyber.fileManager.history.${resolvedScopeKey}`,
    maxHistory,
    notify,
    onEvent,
    onOpenFile: onOpenFile
      ? (entry: FileNode) => onOpenFile(fileNodeToEntry(entry, adapter.pathStyle))
      : undefined,
    onOperationError,
    onOperationSuccess: onOperationSuccess
      ? (
          operation: FileManagerMutation,
          entries: FileNode[],
        ) => onOperationSuccess(
          operation,
          entries.map((entry) => fileNodeToEntry(entry, adapter.pathStyle)),
        )
      : undefined,
    renderPreview: preview
      ? (entry: FileNode) => preview(fileNodeToEntry(entry, adapter.pathStyle))
      : undefined,
    requestManager,
    scopeKey: resolvedScopeKey,
    translate,
  }), [
    adapter,
    getActions,
    historyKey,
    initialPath,
    maxHistory,
    notify,
    onEvent,
    onOpenFile,
    onOperationError,
    onOperationSuccess,
    preview,
    requestManager,
    resolvedCache,
    resolvedScopeKey,
    translate,
  ])

  return (
    <FileManagerRuntimeProvider value={runtime}>
      <FileManagerCore
        key={resolvedScopeKey}
        className={className}
        initialPath={initialPath}
        pathStyle={adapter.pathStyle}
        scopeKey={resolvedScopeKey}
        showTree={showTree}
      />
    </FileManagerRuntimeProvider>
  )
}
