import React from "react"
import { isFileNotFoundError, useFileManagerTranslations } from "../runtime"
import { Button } from "../ui"
import {
  Folder,
  Search,
  RefreshCw,
  AlertTriangle,
  X,
} from "../icons"
import { Tree, TreeApi, NodeRendererProps } from "react-arborist"
import type { NodeApi } from "react-arborist"
import type { FileNode } from "../types"
import { useResizeObserver } from "../hooks/useResizeObserver"

interface FileTreeProps {
  treeRef: React.RefObject<TreeApi<FileNode> | null>
  filteredTreeData: FileNode[]
  treeData: FileNode[]
  expandedNodes: Set<string>
  selection: { selectedIds: Set<string> }
  treeWidth: number
  treeHeight: number
  treeContainerRef: React.RefObject<HTMLDivElement | null>
  treeSearchQuery: string
  setTreeSearchQuery: (query: string) => void
  matchedCount: number
  fileSystemError: string | null
  usesWindowsPaths: boolean
  isMobile: boolean
  initializeFileSystem: () => Promise<void>
  handleNodeSelect: (nodes: NodeApi<FileNode>[], event?: React.MouseEvent) => void
  handleTreeToggle: (id: string) => Promise<void>
  FileNodeRenderer: (props: NodeRendererProps<FileNode>) => React.ReactElement | null
}

export function FileTree({
  treeRef,
  filteredTreeData,
  treeData,
  expandedNodes,
  selection,
  treeWidth,
  treeHeight,
  treeContainerRef,
  treeSearchQuery,
  setTreeSearchQuery,
  matchedCount,
  fileSystemError,
  usesWindowsPaths,
  isMobile,
  initializeFileSystem,
  handleNodeSelect,
  handleTreeToggle,
  FileNodeRenderer,
}: FileTreeProps) {
  const t = useFileManagerTranslations()
  const hasTreeData = treeData.length > 0
  const shouldShowBlockingError = !!fileSystemError &&
    !isFileNotFoundError(fileSystemError) &&
    !hasTreeData

  const searchBox = (
    <div className="px-2 flex items-center border-b border-sidebar-border flex-shrink-0 min-h-[40px]">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
        <input
          type="text"
          placeholder={t('searchFiles')}
          value={treeSearchQuery}
          onChange={(e) => setTreeSearchQuery(e.target.value)}
          className="h-8 pl-9 pr-3 text-xs border-0 rounded-none bg-transparent outline-none focus:bg-muted/30 placeholder:text-muted-foreground/50 w-full"
        />
        {treeSearchQuery && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => setTreeSearchQuery('')}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Search results count */}
      {treeSearchQuery && (
        <div className="text-xs text-muted-foreground mt-1 px-1">
          {matchedCount > 0
            ? t('searchResults', { count: matchedCount })
            : t('noResults')
          }
        </div>
      )}
    </div>
  )

  const statusBar = (
    <div className="flex-shrink-0 border-t border-sidebar-border text-xs text-sidebar-foreground flex items-center justify-between p-2">
      <div>
        {t('pathFormatLabel', {
          format: usesWindowsPaths ? t('windowsPathFormat') : t('posixPathFormat'),
        })}
      </div>
    </div>
  )

  // Desktop tree panel
  if (!isMobile) {
    return (
      <aside className="h-full bg-sidebar overflow-hidden flex flex-col">
        {searchBox}

        <div className="flex-1 relative min-h-0 overflow-x-auto" ref={treeContainerRef as React.Ref<HTMLDivElement>}>
          {shouldShowBlockingError ? (
            <div className="absolute inset-0 flex items-center justify-center text-center p-4">
              <div>
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive mb-2">{t('loadError')}</p>
                <p className="text-sm text-muted-foreground mb-4">{fileSystemError}</p>
                <Button onClick={initializeFileSystem} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('common.retry')}
                </Button>
              </div>
            </div>
          ) : treeWidth > 0 && treeHeight > 0 ? (
            <Tree<FileNode>
              ref={treeRef}
              data={filteredTreeData}
              width={treeWidth}
              height={treeHeight}
              childrenAccessor={(node) => (node.children as FileNode[]) || []}
              openByDefault={false}
              initialOpenState={Object.fromEntries(
                Array.from(expandedNodes).map(id => [id, true])
              )}
              selection={Array.from(selection.selectedIds).filter(id => id != null)[0] || ''}
              disableMultiSelection={false}
              selectionFollowsFocus={false}
              disableEdit={true}
              onSelect={handleNodeSelect}
              onToggle={handleTreeToggle}
              rowHeight={32}
              indent={24}
              paddingTop={8}
              paddingBottom={8}
              overscanCount={10}
            >
              {FileNodeRenderer}
            </Tree>
          ) : null}
        </div>

        {statusBar}
      </aside>
    )
  }

  // Mobile: return null - mobile tree is rendered inside FileToolbar via Sheet
  return null
}

/** Compact tree sheet content used inside FileToolbar. */
export function MobileTreeContent({
  treeRef,
  filteredTreeData,
  treeData,
  expandedNodes,
  treeSearchQuery,
  setTreeSearchQuery,
  matchedCount,
  fileSystemError,
  usesWindowsPaths,
  selection,
  handleNodeSelect,
  handleTreeToggle,
  FileNodeRenderer,
}: {
  treeRef: React.RefObject<TreeApi<FileNode> | null>
  filteredTreeData: FileNode[]
  treeData: FileNode[]
  expandedNodes: Set<string>
  treeSearchQuery: string
  setTreeSearchQuery: (query: string) => void
  matchedCount: number
  fileSystemError: string | null
  usesWindowsPaths: boolean
  selection: { selectedIds: Set<string> }
  handleNodeSelect: (nodes: NodeApi<FileNode>[], event?: React.MouseEvent) => void
  handleTreeToggle: (id: string) => Promise<void>
  FileNodeRenderer: (props: NodeRendererProps<FileNode>) => React.ReactElement | null
}) {
  const t = useFileManagerTranslations()
  const {
    ref: mobileTreeContainerRef,
    width: mobileTreeWidth,
    height: mobileTreeHeight,
  } = useResizeObserver()
  const hasTreeData = treeData.length > 0
  const shouldShowBlockingError = !!fileSystemError &&
    !isFileNotFoundError(fileSystemError) &&
    !hasTreeData

  return (
    <div className="h-full flex flex-col">
      {/* Search box - Mobile */}
      <div className="px-2 flex items-center border-b border-sidebar-border flex-shrink-0 min-h-[40px]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            placeholder={t('searchFiles')}
            value={treeSearchQuery}
            onChange={(e) => setTreeSearchQuery(e.target.value)}
            className="h-8 pl-9 pr-3 text-xs border-0 rounded-none bg-transparent outline-none focus:bg-muted/30 placeholder:text-muted-foreground/50 w-full"
          />
          {treeSearchQuery && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setTreeSearchQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Search results count */}
        {treeSearchQuery && (
          <div className="text-xs text-muted-foreground mt-1 px-1">
            {matchedCount > 0
              ? t('searchResults', { count: matchedCount })
              : t('noResults')
            }
          </div>
        )}
      </div>

      <div
        className="flex-1 relative min-h-0 overflow-x-auto"
        ref={mobileTreeContainerRef as React.Ref<HTMLDivElement>}
      >
        {shouldShowBlockingError ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-4">
            <div>
              <p className="text-sm text-destructive mb-2">{t('fileError')}</p>
              <p className="text-xs text-muted-foreground">{fileSystemError}</p>
            </div>
          </div>
        ) : !hasTreeData ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-4">
            <div>
              <Folder className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm text-muted-foreground">{t('noFiles')}</p>
            </div>
          </div>
        ) : mobileTreeWidth > 0 && mobileTreeHeight > 0 ? (
          <Tree<FileNode>
            ref={treeRef}
            data={filteredTreeData}
            width={mobileTreeWidth}
            height={mobileTreeHeight}
            childrenAccessor={(node) => (node.children as FileNode[]) || []}
            openByDefault={false}
            initialOpenState={Object.fromEntries(
              Array.from(expandedNodes).map(id => [id, true])
            )}
            selection={Array.from(selection.selectedIds).filter(id => id != null)[0] || ''}
            disableMultiSelection={false}
            selectionFollowsFocus={false}
            disableEdit={true}
            onSelect={handleNodeSelect}
            onToggle={handleTreeToggle}
            indent={16}
            rowHeight={32}
            paddingTop={8}
            paddingBottom={8}
            overscanCount={10}
          >
            {FileNodeRenderer}
          </Tree>
        ) : null}
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 border-t border-sidebar-border text-xs text-sidebar-foreground flex items-center justify-between p-2">
        <div>
          {t('pathFormatLabel', {
            format: usesWindowsPaths ? t('windowsPathFormat') : t('posixPathFormat'),
          })}
        </div>
      </div>
    </div>
  )
}
