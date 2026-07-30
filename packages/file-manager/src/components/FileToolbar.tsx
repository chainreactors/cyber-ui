import React, { useEffect, useId, useRef, useState } from "react"
import { useFileManagerRuntime, useFileManagerTranslations } from "../runtime"
import { Button, Input } from "../ui"
import { Separator, Tooltip, TooltipTrigger, TooltipContent } from "../ui"
import { Sheet, SheetContent, SheetTrigger } from "../ui"
import {
  ChevronRight,
  Upload,
  FolderPlus,
  FilePlus,
  RefreshCw,
  HardDrive,
  X,
  List,
  Grid3X3,
  Home,
  Menu,
  ArrowUp,
  Database,
  Wifi,
  History,
} from "../icons"
import type { TreeApi, NodeRendererProps } from "react-arborist"
import type { FileNode, SelectionState } from "../types"
import { formatPathForDisplay } from "../utils/file-manager-utils"
import { cn } from "../class-names"
import { MobileTreeContent } from "./FileTree"

interface FileToolbarProps {
  isMobile: boolean
  usesWindowsPaths: boolean
  currentPath: string
  currentDirPath: string
  pathInputValue: string
  isEditingPath: boolean
  viewMode: 'list' | 'grid'
  selection: SelectionState
  refreshing: boolean
  uploading: boolean
  downloading: boolean
  deleting: boolean
  loadingRoots: boolean
  isAtRoot: boolean
  cacheMode: 'cached' | 'live'
  // Navigation
  navigateToPath: (path: string) => void
  navigateUp: () => void
  navigateHome: () => void
  handleRefresh: () => Promise<void>
  // Setters
  setPathInputValue: (value: string) => void
  setIsEditingPath: (editing: boolean) => void
  setViewMode: (mode: 'list' | 'grid') => void
  setCacheMode: (mode: 'cached' | 'live') => void
  setShowCreateFolder: (show: boolean) => void
  setShowCreateFile: (show: boolean) => void
  setShowUploadDialog: (show: boolean) => void
  setContextMenuTargetPath: (path: string | null) => void
  setUploadTargetPath: (path: string) => void
  setSelectedUploadFile: (file: File | null) => void
  // Actions
  handleBatchDownload: () => Promise<void>
  handleBatchDelete: () => Promise<void>
  handleLoadRoots: () => Promise<void>
  // Compact tree props
  treeRef: React.RefObject<TreeApi<FileNode> | null>
  filteredTreeData: FileNode[]
  treeData: FileNode[]
  expandedNodes: Set<string>
  treeSearchQuery: string
  setTreeSearchQuery: (query: string) => void
  matchedCount: number
  fileSystemError: string | null
  FileNodeRenderer: (props: NodeRendererProps<FileNode>) => React.ReactElement | null
  handleNodeSelect: (nodes: import("react-arborist").NodeApi<FileNode>[], event?: React.MouseEvent) => void
  handleTreeToggle: (id: string) => Promise<void>
  treeOpen: boolean
  setTreeOpen: (open: boolean) => void
}

export function FileToolbar({
  isMobile,
  usesWindowsPaths,
  currentPath,
  currentDirPath,
  pathInputValue,
  isEditingPath,
  viewMode,
  selection,
  refreshing,
  uploading,
  downloading,
  deleting,
  loadingRoots,
  isAtRoot,
  cacheMode,
  navigateToPath,
  navigateUp,
  navigateHome,
  handleRefresh,
  setPathInputValue,
  setIsEditingPath,
  setViewMode,
  setCacheMode,
  setShowCreateFolder,
  setShowCreateFile,
  setShowUploadDialog,
  setContextMenuTargetPath,
  setUploadTargetPath,
  setSelectedUploadFile,
  handleBatchDownload,
  handleBatchDelete,
  handleLoadRoots,
  treeRef,
  filteredTreeData,
  treeData,
  expandedNodes,
  treeSearchQuery,
  setTreeSearchQuery,
  matchedCount,
  fileSystemError,
  FileNodeRenderer,
  handleNodeSelect,
  handleTreeToggle,
  treeOpen,
  setTreeOpen,
}: FileToolbarProps) {
  const t = useFileManagerTranslations()
  const { capabilities, historyKey, maxHistory } = useFileManagerRuntime()
  const historyListId = useId()
  const [recentPaths, setRecentPaths] = useState<string[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sheetContainer, setSheetContainer] = useState<HTMLElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const toolbarButtonSize = isMobile ? 'icon-sm' : 'sm'

  useEffect(() => {
    setSheetContainer(toolbarRef.current?.closest<HTMLElement>('[data-cyber-file-manager]') ?? null)
  }, [])

  useEffect(() => {
    if (!currentPath || typeof window === 'undefined') return
    try {
      const stored = JSON.parse(window.localStorage.getItem(historyKey) || '[]') as unknown
      const previous = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : []
      const next = [currentPath, ...previous.filter((item) => item !== currentPath)].slice(0, maxHistory)
      setRecentPaths(next)
      window.localStorage.setItem(historyKey, JSON.stringify(next))
    } catch {
      setRecentPaths([currentPath])
    }
  }, [currentPath, historyKey, maxHistory])

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "relative flex items-center border-b border-border bg-muted/20 min-h-[40px]",
        isMobile ? "flex-wrap gap-1 px-2 py-1.5" : "gap-2 px-3 py-1.5",
      )}
    >
      {/* Compact tree button */}
      {isMobile && (
        <Sheet modal={false} open={treeOpen} onOpenChange={setTreeOpen}>
          <SheetTrigger asChild>
            <Button aria-label={t('directoryTree')} className="order-1" variant="ghost" size={toolbarButtonSize}>
              <Menu aria-hidden="true" className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent
            aria-label={t('directoryTree')}
            closeLabel={t('common.close')}
            contained
            portalContainer={sheetContainer}
            side="left"
            className="w-72 max-w-full p-0"
          >
            <MobileTreeContent
              treeRef={treeRef}
              filteredTreeData={filteredTreeData}
              treeData={treeData}
              expandedNodes={expandedNodes}
              treeSearchQuery={treeSearchQuery}
              setTreeSearchQuery={setTreeSearchQuery}
              matchedCount={matchedCount}
              fileSystemError={fileSystemError}
              usesWindowsPaths={usesWindowsPaths}
              selection={selection}
              handleNodeSelect={handleNodeSelect}
              handleTreeToggle={handleTreeToggle}
              FileNodeRenderer={FileNodeRenderer}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Navigation buttons */}
      <div className={cn("flex items-center gap-0.5", isMobile && "order-5")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size={toolbarButtonSize} variant="ghost" onClick={navigateHome} aria-label={t('goHome')}>
              <Home className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">{t('goHome')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size={toolbarButtonSize} variant="ghost" onClick={navigateUp} disabled={isAtRoot} aria-label={t('goUp')}>
              <ArrowUp className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">{t('goUp')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size={toolbarButtonSize} variant="ghost" onClick={() => { void handleRefresh() }} disabled={refreshing} aria-label={t('refresh')}>
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">{t('refresh')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={toolbarButtonSize}
              variant={cacheMode === 'live' ? 'secondary' : 'ghost'}
              onClick={() => setCacheMode(cacheMode === 'cached' ? 'live' : 'cached')}
              aria-label={cacheMode === 'cached' ? t('cachedMode') : t('liveMode')}
            >
              {cacheMode === 'cached'
                ? <Database className="w-4 h-4" />
                : <Wifi className="w-4 h-4" />
              }
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">
            {cacheMode === 'cached' ? t('cachedMode') : t('liveMode')}
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className={cn("h-6", isMobile && "hidden")} />

      {/* Breadcrumb / Path Input combo widget */}
      <div className={cn("flex-1 min-w-0", isMobile && "order-2")}>
        {isEditingPath ? (
          /* Edit mode: path input */
          <Input
            list={historyListId}
            aria-label={t('pathInput')}
            value={pathInputValue}
            onChange={(e) => setPathInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const newPath = pathInputValue.trim()
                if (newPath) {
                  navigateToPath(newPath)
                }
                setIsEditingPath(false)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                setPathInputValue(formatPathForDisplay(currentPath, usesWindowsPaths))
                setIsEditingPath(false)
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                setPathInputValue(formatPathForDisplay(currentPath, usesWindowsPaths))
                setIsEditingPath(false)
              }, 150)
            }}
            className="h-8 text-sm"
            autoFocus
          />
        ) : (
          /* Default mode: breadcrumb navigation */
          <div
            className="flex items-center gap-1 text-sm cursor-text rounded-md px-2 py-1 bg-muted/30 hover:bg-muted/50 overflow-x-auto scrollbar-none"
            role="button"
            tabIndex={0}
            aria-label={t('editPath')}
            onClick={() => {
              setPathInputValue(formatPathForDisplay(currentPath, usesWindowsPaths))
              setIsEditingPath(true)
            }}
          >
            {/* Home icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex-shrink-0 cursor-pointer p-0.5 text-muted-foreground hover:text-blue-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigateToPath(usesWindowsPaths ? 'C:/' : '/')
                  }}
                >
                  <Home className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">
                {usesWindowsPaths ? 'C:\\' : '/'}
              </TooltipContent>
            </Tooltip>

            {/* Path segments */}
            {currentDirPath && (
              usesWindowsPaths ? (
                currentDirPath.split(/[/\\]/).filter(Boolean).map((part, index, array) => {
                  const path = array.slice(0, index + 1).join('/')
                  const displayPath = array.slice(0, index + 1).join('\\')
                  return (
                    <React.Fragment key={path}>
                      <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="cursor-pointer whitespace-nowrap transition-colors text-foreground hover:text-blue-500 hover:underline underline-offset-4"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateToPath(path)
                            }}
                          >
                            {part}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">
                          {displayPath}
                        </TooltipContent>
                      </Tooltip>
                    </React.Fragment>
                  )
                })
              ) : (
                currentDirPath !== '/' && currentDirPath.split('/').filter(Boolean).map((part, index, array) => {
                  const path = '/' + array.slice(0, index + 1).join('/')
                  return (
                    <React.Fragment key={path}>
                      <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="cursor-pointer whitespace-nowrap transition-colors text-foreground hover:text-blue-500 hover:underline underline-offset-4"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateToPath(path)
                            }}
                          >
                            {part}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">
                          {path}
                        </TooltipContent>
                      </Tooltip>
                    </React.Fragment>
                  )
                })
              )
            )}
          </div>
        )}
      </div>

      <datalist id={historyListId}>
        {recentPaths.map((path) => <option key={path} value={formatPathForDisplay(path, usesWindowsPaths)} />)}
      </datalist>
      <div
        className={cn("relative", isMobile && "order-3")}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !historyOpen) return
          event.preventDefault()
          event.stopPropagation()
          setHistoryOpen(false)
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size={toolbarButtonSize} variant="ghost" onClick={() => setHistoryOpen((open) => !open)} disabled={recentPaths.length === 0} aria-label={t('recentPaths')}>
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>{t('recentPaths')}</TooltipContent>
        </Tooltip>
        {historyOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 max-h-64 w-80 overflow-auto rounded-md border border-border bg-popover p-1 shadow-xl">
            {recentPaths.map((path) => (
              <button
                key={path}
                type="button"
                className="block w-full truncate rounded px-2 py-1.5 text-left font-mono text-xs text-popover-foreground hover:bg-accent"
                title={formatPathForDisplay(path, usesWindowsPaths)}
                onClick={() => {
                  navigateToPath(path)
                  setHistoryOpen(false)
                }}
              >
                {formatPathForDisplay(path, usesWindowsPaths)}
              </button>
            ))}
          </div>
        )}
      </div>

      {isMobile && <div aria-hidden="true" className="order-4 h-0 basis-full" />}

      <Separator orientation="vertical" className={cn("h-6", isMobile && "hidden")} />

      {/* Action buttons */}
      <div className={cn("flex items-center gap-0.5", isMobile && "order-6 ml-auto flex-wrap")}>
        {/* Upload */}
        {capabilities.upload && <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={toolbarButtonSize}
              variant="ghost"
              onClick={() => {
                setContextMenuTargetPath(null)
                setUploadTargetPath('')
                setSelectedUploadFile(null)
                setShowUploadDialog(true)
              }}
              disabled={uploading}
              aria-label={t('upload')}
            >
              <Upload className={cn("w-4 h-4", uploading && "animate-pulse")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">{t('upload')}</TooltipContent>
        </Tooltip>}

        {/* Create folder */}
        {capabilities.mkdir && <Tooltip>
          <TooltipTrigger asChild>
            <Button size={toolbarButtonSize} variant="ghost" onClick={() => setShowCreateFolder(true)} aria-label={t('createFolder')}>
              <FolderPlus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">{t('createFolder')}</TooltipContent>
        </Tooltip>}

        {/* Create file */}
        {capabilities.createFile && <Tooltip>
          <TooltipTrigger asChild>
            <Button size={toolbarButtonSize} variant="ghost" onClick={() => setShowCreateFile(true)} aria-label={t('newFile')}>
              <FilePlus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">{t('newFile')}</TooltipContent>
        </Tooltip>}

        {/* Additional roots for Windows path spaces */}
        {usesWindowsPaths && capabilities.roots && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size={toolbarButtonSize} variant="ghost" onClick={handleLoadRoots} disabled={loadingRoots} aria-label={t('loadRoots')}>
                <HardDrive className={cn("w-4 h-4", loadingRoots && "animate-pulse")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">{t('loadRoots')}</TooltipContent>
          </Tooltip>
        )}

        {/* View toggle */}
        <Separator orientation="vertical" className="h-6" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size={toolbarButtonSize} variant={viewMode === 'list' ? 'secondary' : 'ghost'} onClick={() => setViewMode('list')} aria-label={t('listView')}>
              <List className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">{t('listView')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size={toolbarButtonSize} variant={viewMode === 'grid' ? 'secondary' : 'ghost'} onClick={() => setViewMode('grid')} aria-label={t('gridView')}>
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="bg-popover text-popover-foreground [&>svg]:hidden">{t('gridView')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
