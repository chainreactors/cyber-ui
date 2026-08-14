import React, { createContext, useContext, useMemo } from "react"
import type { ContextMenuSection } from "../ui"
import { ContextMenuBuilder } from "../ui"
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  RefreshCw,
} from "../icons"
import type { NodeRendererProps } from "react-arborist"
import type { FileNode } from "../types"
import type { OpenNode } from "../hooks/useOpenNode"
import { getFileIcon } from "../utils/file-icons"
import { cn } from "../class-names"

interface FileNodeRendererValue {
  loadingNodes: Set<string>
  currentDirPath: string
  operatingFiles: Set<string>
  openNode: OpenNode
  generateContextMenu: (node: FileNode) => ContextMenuSection[]
  matchedNodeIds: Set<string>
  treeSearchQuery: string
}

const FileNodeRendererContext = createContext<FileNodeRendererValue | null>(null)

/**
 * react-arborist takes the node renderer as its `children`, i.e. as the row's
 * element *type*. Deriving that function from state (the obvious `useCallback`)
 * hands React a brand new type on every change, so React unmounts and remounts
 * every row instead of re-rendering it — silently destroying whatever row-local
 * state was live, most visibly an open Radix context menu. Because listings,
 * refreshes and file operations all land asynchronously, a menu opened just before
 * one settles vanishes a few hundred milliseconds later on its own, which is what
 * made right-click look intermittent.
 *
 * So the renderer below is a single stable component and everything that changes
 * reaches it through this context, which re-renders the rows in place.
 */
export function FileNodeRendererProvider({
  children,
  loadingNodes,
  currentDirPath,
  operatingFiles,
  openNode,
  generateContextMenu,
  matchedNodeIds,
  treeSearchQuery,
}: FileNodeRendererValue & { children: React.ReactNode }) {
  const value = useMemo(() => ({
    loadingNodes,
    currentDirPath,
    operatingFiles,
    openNode,
    generateContextMenu,
    matchedNodeIds,
    treeSearchQuery,
  }), [loadingNodes, currentDirPath, operatingFiles, openNode, generateContextMenu, matchedNodeIds, treeSearchQuery])

  return <FileNodeRendererContext.Provider value={value}>{children}</FileNodeRendererContext.Provider>
}

// Highlight the part of the name matching the tree search query.
function highlightText(text: string, query: string) {
  if (!query.trim()) return text

  const index = text.toLowerCase().indexOf(query.toLowerCase())
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

export function FileNodeRenderer({ node, style, dragHandle }: NodeRendererProps<FileNode>) {
  const context = useContext(FileNodeRendererContext)
  if (!context) return null

  const { loadingNodes, currentDirPath, operatingFiles, openNode, generateContextMenu, matchedNodeIds, treeSearchQuery } = context
  const { data } = node
  const isLoading = loadingNodes.has(data.id)
  const isCurrentDir = currentDirPath === data.id || currentDirPath === data.fullPath
  const isOperating = operatingFiles.has(data.id)
  const isMatched = (node.data as FileNode & { _isMatched?: boolean })._isMatched || matchedNodeIds.has(node.id)

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
          openNode(data)
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
        <span className="min-w-0 flex-1 truncate whitespace-nowrap" title={data.name}>
          {highlightText(data.name, treeSearchQuery)}
        </span>
        {isOperating && (
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
      </div>
    </ContextMenuBuilder>
  )
}
