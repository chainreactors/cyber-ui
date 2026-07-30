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
    selection: { selectedIds: new Set<string>(), lastSelectedId: null, selectRange: false },
    selectedFile: node,
    removeEntry,
    setOperatingFiles: vi.fn(),
    setSelection: vi.fn(),
    setSelectedFile: vi.fn(),
    loadPath: vi.fn().mockResolvedValue([]),
    loadAllFiles: vi.fn().mockResolvedValue([]),
    updateTreeNode: vi.fn(),
    setCurrentDirFiles: vi.fn(),
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
  it('does not report delete success or refresh before remote completion', async () => {
    let finishRemove!: () => void
    const removeEntry = vi.fn(() => new Promise<void>((resolve) => {
      finishRemove = resolve
    })) as unknown as FileManagerState['removeEntry']
    const state = createState(removeEntry)
    const { result } = renderHook(() => useFileActions(state))

    let deleting!: Promise<void>
    act(() => {
      deleting = result.current.handleDelete(node)
    })

    await waitFor(() => expect(removeEntry).toHaveBeenCalled())
    expect(state.toast).not.toHaveBeenCalled()
    expect(state.loadPath).not.toHaveBeenCalled()
    expect(state.loadAllFiles).not.toHaveBeenCalled()

    await act(async () => {
      finishRemove()
      await deleting
    })

    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'deleteSuccess',
    }))
    expect(state.loadPath).toHaveBeenCalledWith('/tmp', true)
    expect(state.loadAllFiles).toHaveBeenCalledWith('/tmp', true)
  })

  it('keeps the entry and cache untouched when remote deletion fails', async () => {
    const removeEntry = vi.fn().mockRejectedValue(new Error('permission denied')) as unknown as FileManagerState['removeEntry']
    const state = createState(removeEntry)
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.handleDelete(node)
    })

    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      title: 'deleteFailed',
      description: 'permission denied',
    }))
    expect(state.setSelection).not.toHaveBeenCalled()
    expect(state.setSelectedFile).not.toHaveBeenCalled()
    expect(state.loadPath).not.toHaveBeenCalled()
    expect(state.loadAllFiles).not.toHaveBeenCalled()
  })

  it('does not report a failed deletion when a newer listing supersedes its refresh', async () => {
    const removeEntry = vi.fn().mockResolvedValue(undefined) as unknown as FileManagerState['removeEntry']
    const state = createState(removeEntry)
    state.loadPath = vi.fn().mockRejectedValue(
      new FileManagerError('aborted', 'Operation aborted'),
    )
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.handleDelete(node)
    })

    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'deleteSuccess',
    }))
    expect(state.toast).not.toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      title: 'deleteFailed',
    }))
  })

  it('updates the directory tree after a dialog upload completes', async () => {
    const state = createUploadState()
    const treeChildren = [{ ...node, name: 'report.txt' }]
    state.loadPath = vi.fn().mockResolvedValue(treeChildren)
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.executeUpload()
    })

    expect(state.loadPath).toHaveBeenCalledWith('/tmp', true)
    expect(state.updateTreeNode).toHaveBeenCalledWith('/tmp', treeChildren)
  })

  it('updates the directory tree after dropped uploads complete', async () => {
    const state = createUploadState()
    const treeChildren = [{ ...node, name: 'dropped.txt' }]
    state.loadPath = vi.fn().mockResolvedValue(treeChildren)
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.handleFilesDropped([
        new File(['content'], 'dropped.txt', { type: 'text/plain' }),
      ])
    })

    expect(state.loadPath).toHaveBeenCalledWith('/tmp', true)
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
    state.loadPath = vi.fn().mockResolvedValue(treeChildren)
    state.loadAllFiles = vi.fn().mockResolvedValue(treeChildren)
    const { result } = renderHook(() => useFileActions(state))

    await act(async () => {
      await result.current.handleCreateFolder()
    })

    expect(state.loadAllFiles).toHaveBeenCalledWith('c:/users/jack/desktop/z', true)
    expect(state.setCurrentDirFiles).toHaveBeenCalledWith(treeChildren)
  })
})
