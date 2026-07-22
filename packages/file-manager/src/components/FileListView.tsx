import React, { useRef, useMemo } from "react"
import { useTranslations } from "../runtime"
import {
  ContextMenuBuilder,
  SortableTableHead,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ColumnResizeHandle,
  useColumnResize,
  compactTableClasses,
} from "../ui"
import type { ContextMenuSection, ResizableColumnDef } from "../ui"
import {
  Folder,
  Upload,
} from "../icons"
import type { FileNode } from "../types"
import type { FileSortKey } from "../hooks/useFileSort"
import { parseFileSize, formatTime, LARGE_FILE_WARNING_BYTES, HUGE_FILE_WARNING_BYTES } from "../utils/file-manager-utils"
import { getFileIcon } from "../utils/file-icons"
import { cn } from "../class-names"
import { FileSelectionBar } from "./FileSelectionBar"
import { useFileManagerRuntime } from "../runtime"

interface FileListViewProps {
  currentDirFiles: FileNode[]
  currentDirPath: string
  visibleFiles: FileNode[]
  selectedFile: FileNode | null
  viewMode: 'list' | 'grid'
  sortKey: FileSortKey
  sortDirection: 'asc' | 'desc'
  isDragging: boolean
  dragHandlers: Record<string, (e: React.DragEvent) => void>
  handleFileListScroll: (event: React.UIEvent<HTMLDivElement>) => void
  handleSort: (key: FileSortKey) => void
  navigateToPath: (path: string) => void
  setSelectedFile: (file: FileNode | null) => void
  setFileSizeWarning: (warning: { file: FileNode; sizeInBytes: number } | null) => void
  generateDirectoryContextMenu: (targetPath: string) => ContextMenuSection[]
  generateContextMenu: (node: FileNode) => ContextMenuSection[]
  selectedIds?: Set<string>
  onFileSelect?: (fileId: string, event: React.MouseEvent) => void
  onBatchDownload?: () => void
  onBatchDelete?: () => void
  onClearSelection?: () => void
}

export function FileListView({
  currentDirFiles,
  currentDirPath,
  visibleFiles,
  selectedFile,
  viewMode,
  sortKey,
  sortDirection,
  isDragging,
  dragHandlers,
  handleFileListScroll,
  handleSort,
  navigateToPath,
  setSelectedFile,
  setFileSizeWarning,
  generateDirectoryContextMenu,
  generateContextMenu,
  selectedIds,
  onFileSelect,
  onBatchDownload,
  onBatchDelete,
  onClearSelection,
}: FileListViewProps) {
  const t = useTranslations('Sessions.fileManagement')
  const { onOpenFile, renderPreview } = useFileManagerRuntime()
  const showModeColumn = visibleFiles.some(file => Boolean(file.mode))
  const showLinkColumn = visibleFiles.some(file => Boolean(file.link))

  const tableRef = useRef<HTMLTableElement>(null)
  const resizeColumns: ResizableColumnDef[] = useMemo(() => {
    if (showModeColumn && showLinkColumn) {
      return [
        { key: 'name', initialWidthPct: 35, minWidth: 150 },
        { key: 'mode', initialWidthPct: 15, minWidth: 110 },
        { key: 'size', initialWidthPct: 12, minWidth: 80 },
        { key: 'time', initialWidthPct: 23, minWidth: 120 },
        { key: 'link', initialWidthPct: 15, minWidth: 120 },
      ]
    }
    if (showModeColumn) {
      return [
        { key: 'name', initialWidthPct: 42, minWidth: 150 },
        { key: 'mode', initialWidthPct: 16, minWidth: 110 },
        { key: 'size', initialWidthPct: 16, minWidth: 80 },
        { key: 'time', initialWidthPct: 26, minWidth: 120 },
      ]
    }
    if (showLinkColumn) {
      return [
        { key: 'name', initialWidthPct: 42, minWidth: 150 },
        { key: 'size', initialWidthPct: 16, minWidth: 80 },
        { key: 'time', initialWidthPct: 27, minWidth: 120 },
        { key: 'link', initialWidthPct: 15, minWidth: 120 },
      ]
    }
    return [
      { key: 'name', initialWidthPct: 50, minWidth: 150 },
      { key: 'size', initialWidthPct: 20, minWidth: 80 },
      { key: 'time', initialWidthPct: 30, minWidth: 120 },
    ]
  }, [showModeColumn, showLinkColumn])
  const { getColumnStyle, getResizeHandler } = useColumnResize({ columns: resizeColumns, tableRef })

  const handleFileDoubleClick = (e: React.MouseEvent, file: FileNode) => {
    e.stopPropagation()
    if (file.isDirectory && file.fullPath) {
      navigateToPath(file.fullPath)
    } else if (!file.isDirectory && file.fullPath) {
      const fileSizeInBytes = parseFileSize(file.size)

      if (fileSizeInBytes >= HUGE_FILE_WARNING_BYTES) {
        setFileSizeWarning({ file, sizeInBytes: fileSizeInBytes })
      } else if (fileSizeInBytes >= LARGE_FILE_WARNING_BYTES) {
        setFileSizeWarning({ file, sizeInBytes: fileSizeInBytes })
      } else if (onOpenFile) {
        onOpenFile(file)
      } else if (renderPreview) {
        setSelectedFile(file)
      }
    }
  }

  return (
    <ContextMenuBuilder sections={generateDirectoryContextMenu(currentDirPath)}>
      <div
        {...dragHandlers}
        onScroll={handleFileListScroll}
        className={cn(
          "flex-1 overflow-auto relative",
          isDragging && "ring-2 ring-primary ring-inset bg-primary/5"
        )}
      >
        {/* Drag and drop hint */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 pointer-events-none z-50">
            <div className="flex flex-col items-center gap-4 text-primary">
              <Upload className="w-16 h-16" />
              <p className="text-lg font-normal">{t('dragDropHint')}</p>
            </div>
          </div>
        )}

        {currentDirFiles.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Folder className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>{t('emptyDirectory')}</p>
              <p className="text-sm mt-1">{t('createFolder')}</p>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <Table fixed ref={tableRef}>
            <TableHeader>
              <TableRow className={compactTableClasses.tableHeader}>
                <TableHead className={`${compactTableClasses.tableHead}`} style={getColumnStyle('name', '50%')}>
                  <SortableTableHead
                    label={t('name')}
                    sortKey="name"
                    currentSortKey={sortKey}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <ColumnResizeHandle {...getResizeHandler('name')} />
                </TableHead>
                {showModeColumn && (
                  <TableHead className={`${compactTableClasses.tableHead}`} style={getColumnStyle('mode', '16%')}>
                    <SortableTableHead
                      label={t('mode')}
                      sortKey="mode"
                      currentSortKey={sortKey}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <ColumnResizeHandle {...getResizeHandler('mode')} />
                  </TableHead>
                )}
                <TableHead className={`${compactTableClasses.tableHead}`} style={getColumnStyle('size', '20%')}>
                  <SortableTableHead
                    label={t('size')}
                    sortKey="size"
                    currentSortKey={sortKey}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <ColumnResizeHandle {...getResizeHandler('size')} />
                </TableHead>
                <TableHead className={`${compactTableClasses.tableHead}`} style={getColumnStyle('time', '30%')}>
                  <SortableTableHead
                    label={t('time')}
                    sortKey="time"
                    currentSortKey={sortKey}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  {showLinkColumn && <ColumnResizeHandle {...getResizeHandler('time')} />}
                </TableHead>
                {showLinkColumn && (
                  <TableHead className={`${compactTableClasses.tableHead}`} style={getColumnStyle('link', '15%')}>
                    <SortableTableHead
                      label={t('properties.link')}
                      sortKey="link"
                      currentSortKey={sortKey}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleFiles.map((file) => {
                  const isPreviewSelected = selectedFile?.id === file.id
                  const isMultiSelected = selectedIds?.has(file.id) ?? false
                  const { Icon, color } = getFileIcon(file.name, file.isDirectory)

                  return (
                    <ContextMenuBuilder key={file.id} sections={() => generateContextMenu(file)}>
                      <TableRow
                        className={cn(
                          "cursor-pointer transition-colors duration-150",
                          "hover:bg-accent/60 active:bg-accent",
                          isMultiSelected && !isPreviewSelected && "bg-accent hover:bg-accent",
                          isPreviewSelected && "bg-muted hover:bg-muted",
                        )}
                        onClick={(e) => onFileSelect?.(file.id, e)}
                        onDoubleClick={(e) => handleFileDoubleClick(e, file)}
                      >
                        <TableCell className="py-2 px-4">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon className={cn("w-4 h-4 flex-shrink-0", color)} />
                            <span className="truncate text-sm">{file.name}</span>
                          </div>
                        </TableCell>
                        {showModeColumn && (
                          <TableCell className="py-2 px-4 text-sm text-muted-foreground font-mono">
                            {file.mode || '-'}
                          </TableCell>
                        )}
                        <TableCell className="py-2 px-4 text-sm text-muted-foreground">
                          {file.isDirectory ? '-' : (file.size || '-')}
                        </TableCell>
                        <TableCell className="py-2 px-4 text-sm text-muted-foreground">
                          {formatTime(file.time)}
                        </TableCell>
                        {showLinkColumn && (
                          <TableCell className="py-2 px-4 text-sm text-muted-foreground">
                            <span className="block truncate font-mono" title={file.link || undefined}>
                              {file.link || '-'}
                            </span>
                          </TableCell>
                        )}
                      </TableRow>
                    </ContextMenuBuilder>
                  )
                })}
            </TableBody>
          </Table>
        ) : (
          /* Grid View */
          <div className="p-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
              {visibleFiles.map((file) => {
                  const isPreviewSelected = selectedFile?.id === file.id
                  const isMultiSelected = selectedIds?.has(file.id) ?? false
                  const { Icon, color } = getFileIcon(file.name, file.isDirectory)

                  return (
                    <ContextMenuBuilder key={file.id} sections={() => generateContextMenu(file)}>
                      <div
                         className={cn(
                           "flex flex-col items-center p-3 rounded-lg cursor-pointer transition-colors duration-150",
                           "hover:bg-accent/60 border border-transparent hover:border-border active:bg-accent",
                           isMultiSelected && !isPreviewSelected && "bg-accent border-border",
                           isPreviewSelected && "bg-muted border-border",
                         )}
                         onClick={(e) => onFileSelect?.(file.id, e)}
                         onDoubleClick={(e) => handleFileDoubleClick(e, file)}
                      >
                        <div className="mb-2">
                          <Icon className={cn("w-12 h-12", color)} />
                        </div>
                        <div className="text-center w-full">
                          <div className="text-sm font-normal truncate" title={file.name}>
                            {file.name}
                          </div>
                          {!file.isDirectory && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {file.size || '-'}
                            </div>
                          )}
                        </div>
                      </div>
                    </ContextMenuBuilder>
                  )
                })}
            </div>
          </div>
        )}

        {/* Floating selection action bar */}
        {selectedIds && selectedIds.size > 0 && (onBatchDownload || onBatchDelete) && onClearSelection && (
          <FileSelectionBar
            selectedCount={selectedIds.size}
            onDownload={onBatchDownload}
            onDelete={onBatchDelete}
            onClear={onClearSelection}
          />
        )}
      </div>
    </ContextMenuBuilder>
  )
}
