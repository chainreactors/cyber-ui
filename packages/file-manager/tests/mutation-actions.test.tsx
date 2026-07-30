import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useFileActions } from '../src/hooks/useFileActions'
import { FileManagerError } from '../src/contracts'
import type { FileManagerState } from '../src/hooks/useFileManagerState'
import type { FileNode } from '../src/types'

const node: FileNode = {
  id: '/tmp/report.txt',
  name: 'report.txt',
  fullPath: '/tmp/report.txt',
  isDirectory: false,
}

function createState(removeEntry: FileManagerState['removeEntry']) {
  return {
    t: (key: string) => key,
    toast: vi.fn(),
    usesWindowsPaths: false,
    currentPath: '/tmp',
    currentDirPath: '/tmp',
    currentDirFiles: [node],
    selection: { selectedIds: new Set<string>(), lastSelectedId: null, selectRange: false },
    selectedFile: node,
    deleteTargets: [] as FileNode[],
    deleting: false,
    removeEntry,
    setOperatingFiles: vi.fn(),
    setSelection: vi.fn(),
    setSelectedFile: vi.fn(),
    setDeleteTargets: vi.fn(),
    setDeleting: vi.fn(),
    loadDirectorySnapshot: vi.fn().mockResolvedValue({ directories: [], allFiles: [] }),
    updateTreeNode: vi.fn(),
    setCurrentDirFiles: vi.fn(),
    triggerCacheUpdate: vi.fn(),
    treeRef: { current: { get: vi.fn() } },
  } as unknown as FileManagerState
}

function createUploadState() {
  const state = createState(vi.fn().mockResolvedValue(undefined) as unknown as FileManagerState['removeEntry'])
  return Object.assign(state, {
    selectedUploadFile: new File(['content'], 'report.txt', { type: 'text/plain' }),
    uploadTargetPath: '/tmp/report.txt',
    contextMenuTargetPath: null,
    uploadFile: vi.fn().mockResolvedValue(undefined),
    setUploading: vi.fn(),
    setShowUploadDialog: vi.fn(),
    setSelectedUploadFile: vi.fn(),
    setUploadTargetPath: vi.fn(),
    setContextMenuTargetPath: vi.fn(),
    setUploadQueue: vi.fn(),
    setShowUploadProgress: vi.fn(),
  })
}

describe('file mutation action synchronization', () => {
  it('opens confirmation without starting a remote deletion', async () => {
    const removeEntry = vi.fn().mockResolvedValue(undefined) as unknown as FileManagerState['removeEntry']
    const state = createState(removeEntry)
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.handleDelete(node)
    })

    expect(state.setDeleteTargets).toHaveBeenCalledWith([node])
    expect(removeEntry).not.toHaveBeenCalled()
  })

  it('does not report delete success or refresh before remote completion', async () => {
    let finishRemove!: () => void
    const removeEntry = vi.fn(() => new Promise<void>((resolve) => {
      finishRemove = resolve
    })) as unknown as FileManagerState['removeEntry']
    const state = createState(removeEntry)
    state.deleteTargets = [node]
    const { result } = renderHook(() => useFileActions(state))

    let deleting!: Promise<void>
    act(() => {
      deleting = result.current.executeDelete()
    })

    await waitFor(() => expect(removeEntry).toHaveBeenCalled())
    expect(state.toast).not.toHaveBeenCalled()
    expect(state.loadDirectorySnapshot).not.toHaveBeenCalled()

    await act(async () => {
      finishRemove()
      await deleting
    })

    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'deleteSuccess',
    }))
    expect(state.loadDirectorySnapshot).toHaveBeenCalledTimes(1)
    expect(state.loadDirectorySnapshot).toHaveBeenCalledWith('/tmp', true)
  })

  it('keeps the entry and cache untouched when remote deletion fails', async () => {
    const removeEntry = vi.fn().mockRejectedValue(new Error('permission denied')) as unknown as FileManagerState['removeEntry']
    const state = createState(removeEntry)
    state.deleteTargets = [node]
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.executeDelete()
    })

    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      title: 'deleteFailed',
      description: 'permission denied',
    }))
    expect(state.setSelection).not.toHaveBeenCalled()
    expect(state.setSelectedFile).not.toHaveBeenCalled()
    expect(state.loadDirectorySnapshot).not.toHaveBeenCalled()
  })

  it('keeps failed selections after a partially successful batch deletion', async () => {
    const failedNode: FileNode = {
      ...node,
      id: '/tmp/locked.txt',
      fullPath: '/tmp/locked.txt',
      name: 'locked.txt',
    }
    const removeEntry = vi.fn(async (path: string) => {
      if (path === failedNode.fullPath) throw new Error('permission denied')
    }) as unknown as FileManagerState['removeEntry']
    const state = createState(removeEntry)
    state.deleteTargets = [node, failedNode]
    state.selection = {
      selectedIds: new Set([node.id, failedNode.id]),
      lastSelectedId: failedNode.id,
      selectRange: false,
    }
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.executeDelete()
    })

    expect(removeEntry).toHaveBeenCalledTimes(2)
    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'batchDeleteComplete',
      description: 'batchDeleteCompleteDesc',
    }))
    const updateSelection = vi.mocked(state.setSelection).mock.calls[0][0] as (
      previous: typeof state.selection,
    ) => typeof state.selection
    const nextSelection = updateSelection(state.selection)
    expect(nextSelection.selectedIds.has(node.id)).toBe(false)
    expect(nextSelection.selectedIds.has(failedNode.id)).toBe(true)
    expect(state.loadDirectorySnapshot).toHaveBeenCalledTimes(1)
  })

  it('does not report a failed deletion when a newer listing supersedes its refresh', async () => {
    const removeEntry = vi.fn().mockResolvedValue(undefined) as unknown as FileManagerState['removeEntry']
    const state = createState(removeEntry)
    state.deleteTargets = [node]
    state.loadDirectorySnapshot = vi.fn().mockRejectedValue(
      new FileManagerError('aborted', 'Operation aborted'),
    )
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.executeDelete()
    })

    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'deleteSuccess',
    }))
    expect(state.toast).not.toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      title: 'deleteFailed',
    }))
    expect(state.toast).not.toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      title: 'refreshFailed',
    }))
  })

  it('updates the directory tree after a dialog upload completes', async () => {
    const state = createUploadState()
    const treeChildren = [{ ...node, name: 'report.txt' }]
    state.loadDirectorySnapshot = vi.fn().mockResolvedValue({
      directories: treeChildren,
      allFiles: treeChildren,
    })
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.executeUpload()
    })

    expect(state.loadDirectorySnapshot).toHaveBeenCalledWith('/tmp', true)
    expect(state.updateTreeNode).toHaveBeenCalledWith('/tmp', treeChildren)
  })

  it('updates the directory tree after dropped uploads complete', async () => {
    const state = createUploadState()
    const treeChildren = [{ ...node, name: 'dropped.txt' }]
    state.loadDirectorySnapshot = vi.fn().mockResolvedValue({
      directories: treeChildren,
      allFiles: treeChildren,
    })
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.handleFilesDropped([
        new File(['content'], 'dropped.txt', { type: 'text/plain' }),
      ])
    })

    expect(state.loadDirectorySnapshot).toHaveBeenCalledWith('/tmp', true)
    expect(state.updateTreeNode).toHaveBeenCalledWith('/tmp', treeChildren)
  })

  it('refreshes the visible Windows directory when path casing differs', async () => {
    const state = Object.assign(
      createState(vi.fn().mockResolvedValue(undefined) as unknown as FileManagerState['removeEntry']),
      {
        usesWindowsPaths: true,
        currentPath: 'C:/Users/jack/Desktop/z',
        currentDirPath: 'c:/users/jack/desktop/z',
        newFolderName: 'new-folder',
        creatingFolder: false,
        createDirectory: vi.fn().mockResolvedValue(undefined),
        setCreatingFolder: vi.fn(),
        setShowCreateFolder: vi.fn(),
        setNewFolderName: vi.fn(),
        setContextMenuTargetPath: vi.fn(),
        triggerCacheUpdate: vi.fn(),
      },
    )
    const treeChildren = [{
      id: 'C:/Users/jack/Desktop/z/new-folder',
      name: 'new-folder',
      fullPath: 'C:/Users/jack/Desktop/z/new-folder',
      isDirectory: true,
    }]
    state.loadDirectorySnapshot = vi.fn().mockResolvedValue({
      directories: treeChildren,
      allFiles: treeChildren,
    })
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.handleCreateFolder()
    })

    expect(state.loadDirectorySnapshot).toHaveBeenCalledWith('C:/Users/jack/Desktop/z', true)
    expect(state.setCurrentDirFiles).toHaveBeenCalledWith(treeChildren)
  })

  it('keeps a successful mutation successful when only the follow-up refresh fails', async () => {
    const state = Object.assign(
      createState(vi.fn().mockResolvedValue(undefined) as unknown as FileManagerState['removeEntry']),
      {
        newFolderName: 'archive',
        creatingFolder: false,
        createDirectory: vi.fn().mockResolvedValue(undefined),
        setCreatingFolder: vi.fn(),
        setShowCreateFolder: vi.fn(),
        setNewFolderName: vi.fn(),
        setContextMenuTargetPath: vi.fn(),
      },
    )
    state.loadDirectorySnapshot = vi.fn().mockRejectedValue(new Error('refresh timeout'))
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.handleCreateFolder()
    })

    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'folderCreateSuccess',
    }))
    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      title: 'refreshFailed',
    }))
    expect(state.toast).not.toHaveBeenCalledWith(expect.objectContaining({
      title: 'folderCreateFailed',
    }))
  })

  it('resolves selected files from the visible list when they are absent from the tree', async () => {
    const state = createState(vi.fn().mockResolvedValue(undefined) as unknown as FileManagerState['removeEntry'])
    state.selection = {
      selectedIds: new Set([node.id]),
      lastSelectedId: node.id,
      selectRange: false,
    }
    state.downloadFile = vi.fn().mockResolvedValue(undefined)
    state.setDownloading = vi.fn()
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.handleBatchDelete()
    })
    expect(state.setDeleteTargets).toHaveBeenCalledWith([node])

    await act(async () => {
      await result.current.handleBatchDownload()
    })
    expect(state.downloadFile).toHaveBeenCalledWith('/tmp/report.txt', expect.objectContaining({
      name: 'report.txt',
    }))
  })
})
