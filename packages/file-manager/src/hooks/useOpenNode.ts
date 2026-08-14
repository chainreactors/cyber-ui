"use client"

import { useCallback } from "react"
import { useFileManagerRuntime } from "../runtime"
import type { FileNode } from "../types"
import { parseFileSize, LARGE_FILE_WARNING_BYTES } from "../utils/file-manager-utils"

interface UseOpenNodeParams {
  navigateToPath: (path: string) => void
  setFileSizeWarning: (warning: { file: FileNode; sizeInBytes: number } | null) => void
  setSelectedFile: (file: FileNode | null) => void
}

/**
 * The one "open this node" behaviour, shared by every entry point that has one:
 * the tree's double-click, the list/grid's double-click, the context menu's Open
 * action and the large-file dialog's confirm. Directories navigate; files hand off
 * to the host's `onOpenFile`, falling back to the built-in preview when the host
 * renders one. Files past the size threshold stop at the confirmation dialog,
 * which calls back in with `force` once the user accepts.
 *
 * Keeping this in one place is what stops the entry points from drifting apart —
 * they previously did, and the tree's copy could only open directories.
 */
export function useOpenNode({ navigateToPath, setFileSizeWarning, setSelectedFile }: UseOpenNodeParams) {
  const { onOpenFile, renderPreview } = useFileManagerRuntime()

  return useCallback((node: FileNode, options?: { force?: boolean }) => {
    const path = node.fullPath
    if (!path) return

    if (node.isDirectory) {
      navigateToPath(path)
      return
    }

    const sizeInBytes = parseFileSize(node.size)
    if (!options?.force && sizeInBytes >= LARGE_FILE_WARNING_BYTES) {
      setFileSizeWarning({ file: node, sizeInBytes })
      return
    }

    if (onOpenFile) onOpenFile(node)
    else if (renderPreview) setSelectedFile(node)
  }, [navigateToPath, onOpenFile, renderPreview, setFileSizeWarning, setSelectedFile])
}

export type OpenNode = ReturnType<typeof useOpenNode>
