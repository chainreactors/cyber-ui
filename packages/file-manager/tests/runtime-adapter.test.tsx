import React, { type PropsWithChildren } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createFileManagerRuntimeTranslator } from '../src/FileManager'
import { FileManagerRequestManager } from '../src/request-manager'
import {
  FileManagerRuntimeProvider,
  useFileSystem,
  type FileManagerRuntimeValue,
} from '../src/runtime'
import type { FileManagerAdapter, FileListing } from '../src/contracts'

const emptyListing = (path: string): FileListing => ({ path, entries: [] })

function runtimeFor(adapter: FileManagerAdapter): FileManagerRuntimeValue {
  return {
    adapter,
    cache: false,
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
      preview: false,
    },
    initialPath: adapter.pathStyle === 'windows' ? 'C:/' : '/',
    historyKey: 'test.history',
    maxHistory: 3,
    notify: vi.fn(),
    requestManager: new FileManagerRequestManager(),
    scopeKey: 'test',
    translate: (key) => key,
  }
}

function wrapperFor(runtime: FileManagerRuntimeValue) {
  return function RuntimeWrapper({ children }: PropsWithChildren) {
    return (
      <FileManagerRuntimeProvider value={runtime}>
        {children}
      </FileManagerRuntimeProvider>
    )
  }
}

describe('file manager runtime adapter boundary', () => {
  it('falls back when the host translator returns a namespaced missing key', () => {
    const translate = createFileManagerRuntimeTranslator({
      locale: 'zh-CN',
      translate: (key) => `host.fileManager.${key}`,
    })

    expect(translate('pathFormatLabel', { format: 'Windows' }))
      .toBe('路径格式：Windows')
  })

  it('passes canonical Windows paths and cancellable operation context', async () => {
    const list = vi.fn(async (path: string, context: { signal: AbortSignal; requestId: string }) => {
      expect(context.signal).toBeInstanceOf(AbortSignal)
      expect(context.requestId).toMatch(/^file-manager-/)
      return emptyListing(path)
    })
    const adapter: FileManagerAdapter = { pathStyle: 'windows', list }
    const { result } = renderHook(useFileSystem, { wrapper: wrapperFor(runtimeFor(adapter)) })

    await act(async () => {
      await result.current.listDirectory('c:')
    })

    expect(list).toHaveBeenCalledWith('C:/', expect.any(Object))
  })

  it('marks forced listings as fresh for host cache bypass', async () => {
    const list = vi.fn(async (path: string, context: { fresh?: boolean }) => {
      expect(context.fresh).toBe(true)
      return emptyListing(path)
    })
    const adapter: FileManagerAdapter = { pathStyle: 'posix', list }
    const { result } = renderHook(useFileSystem, { wrapper: wrapperFor(runtimeFor(adapter)) })

    await act(async () => {
      await result.current.listDirectory('/tmp', true)
    })

    expect(list).toHaveBeenCalledWith('/tmp', expect.objectContaining({ fresh: true }))
  })

  it('discards a superseded response even when the host request cannot be canceled', async () => {
    const resolvers: Array<(listing: FileListing) => void> = []
    const adapter: FileManagerAdapter = {
      pathStyle: 'posix',
      list: (path) => new Promise((resolve) => {
        resolvers.push(() => resolve(emptyListing(path)))
      }),
    }
    const runtime = runtimeFor(adapter)
    runtime.onOperationError = vi.fn()
    const { result } = renderHook(useFileSystem, { wrapper: wrapperFor(runtime) })

    const first = result.current.listDirectory('/tmp')
    const firstExpectation = expect(first).rejects.toMatchObject({ code: 'aborted' })
    const second = result.current.listDirectory('/tmp')

    await act(async () => {
      resolvers[1](emptyListing('/tmp'))
      await second
    })
    await act(async () => {
      resolvers[0](emptyListing('/tmp'))
    })

    await firstExpectation
    expect(runtime.onOperationError).not.toHaveBeenCalled()
  })

  it('locks conflicting mutation paths without blocking unrelated paths', async () => {
    let finishRemove!: () => void
    const remove = vi.fn(() => new Promise<void>((resolve) => {
      finishRemove = resolve
    }))
    const createFile = vi.fn().mockResolvedValue(undefined)
    const chmod = vi.fn().mockResolvedValue(undefined)
    const adapter: FileManagerAdapter = {
      pathStyle: 'posix',
      list: async (path) => emptyListing(path),
      createFile,
      remove,
      chmod,
    }
    const { result } = renderHook(useFileSystem, {
      wrapper: wrapperFor(runtimeFor(adapter)),
    })

    let removing!: Promise<void>
    act(() => {
      removing = result.current.removeEntry('/tmp/folder')
    })

    await waitFor(() => {
      expect(result.current.pendingMutationPaths.has('/tmp/folder')).toBe(true)
    })

    await act(async () => {
      await result.current.createFileEntry('/tmp/b.txt')
    })
    expect(createFile).toHaveBeenCalledTimes(1)

    await expect(result.current.changeMode('/tmp/folder', '0644'))
      .rejects.toMatchObject({ code: 'busy' })
    expect(chmod).not.toHaveBeenCalled()

    await expect(result.current.createFileEntry('/tmp/folder/child.txt'))
      .rejects.toMatchObject({ code: 'busy' })
    expect(createFile).toHaveBeenCalledTimes(1)

    await act(async () => {
      finishRemove()
      await removing
    })

    expect(result.current.pendingMutationPaths.size).toBe(0)
  })
})
