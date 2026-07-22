import React, { useCallback } from "react"
import type { ContextMenuSection } from "../ui"
import { ContextMenuBuilder } from "../ui"
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  File,
} from "../icons"
import type { NodeApi, NodeRendererProps } from "react-arborist"
import type { FileNode } from "../types"
import { getFileIcon } from "../utils/file-icons"
import { cn } from "../class-names"

interface UseFileNodeRendererParams {
  loadingNodes: Set<string>
  currentDirPath: string
  operatingFiles: Set<string>
  navigateToPath: (path: string) => void
  generateContextMenu: (node: FileNode) => ContextMenuSection[]
  matchedNodeIds: Set<string>
  treeSearchQuery: string
}

export function useFileNodeRenderer({
  loadingNodes,
  currentDirPath,
  operatingFiles,
  navigateToPath,
  generateContextMenu,
  matchedNodeIds,
  treeSearchQuery,
}: UseFileNodeRendererParams) {
  const FileNodeRenderer = useCallback(({ node, style, dragHandle }: NodeRendererProps<FileNode>) => {
    const { data } = node
    const isLoading = loadingNodes.has(data.id)
    const isCurrentDir = currentDirPath === data.id || currentDirPath === data.fullPath
    const isOperating = operatingFiles.has(data.id)
    const isMatched = (node.data as FileNode & { _isMatched?: boolean })._isMatched || matchedNodeIds.has(node.id)

    // Helper function to highlight matched text
    const highlightText = (text: string, query: string) => {
      if (!query.trim()) return text

      const lowerText = text.toLowerCase()
      const lowerQuery = query.toLowerCase()
      const index = lowerText.indexOf(lowerQuery)

      if (index === -1) return text

      return (
        <>
          {text.substring(0, index)}
          <mark className="bg-yellow-300 dark:bg-yellow-600 text-foreground px-0.5 rounded">
            {text.substring(index, index + query.length)}
          </mark>
          {text.substring(index + query.length)}
        </>
      )
    }

    return (
      <ContextMenuBuilder sections={() => generateContextMenu(data)}>
      <div
        style={style}
        ref={dragHandle}
          className={cn(
            "flex h-full min-w-0 items-center gap-1.5 overflow-hidden px-2 cursor-pointer rounded-md text-sm transition-colors duration-150",
            "hover:bg-primary/10 active:bg-primary/20",
            isCurrentDir && "bg-muted text-foreground font-normal",
            isMatched && "font-normal"
          )}
          onDoubleClick={(e) => {
            e.stopPropagation()
            if (data.isDirectory && data.fullPath) {
              navigateToPath(data.fullPath)
            }
          }}
        >
          {data.isDirectory ? (
            <>
              <button
                className="p-0.5 hover:bg-muted rounded flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  node.toggle()
                }}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                ) : node.isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {node.isOpen ? (
                <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </>
          ) : (
            <>
              <div className="w-5 flex-shrink-0" />
              {(() => {
                const { Icon, color } = getFileIcon(data.name, false)
                return <Icon className={cn("w-4 h-4 flex-shrink-0", color)} />
              })()}
            </>
          )}
          <span className="min-w-0 flex-1 truncate whitespace-nowrap">
            {highlightText(data.name, treeSearchQuery)}
          </span>
              {isOperating && (
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          </div>
        </ContextMenuBuilder>
    )
  }, [
    loadingNodes,
    currentDirPath,
    operatingFiles,
    navigateToPath,
    generateContextMenu,
    matchedNodeIds,
    treeSearchQuery
  ])

  return FileNodeRenderer
}
