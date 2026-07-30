import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FileManager } from '../src/FileManager'
import { FILE_MANAGER_SNAPSHOT_VERSION } from '../src/cache'
import type { FileManagerAdapter, FileListing } from '../src/contracts'

const fileListing = (name = 'report.txt'): FileListing => ({
  path: '/tmp',
  entries: [{
    id: `/tmp/${name}`,
    path: `/tmp/${name}`,
    name,
    kind: 'file',
  }],
})

describe('file manager interactions', () => {
  it('shows a loading state instead of an empty directory while listing', async () => {
    let finishListing!: (listing: FileListing) => void
    const list = vi.fn(() => new Promise<FileListing>((resolve) => {
      finishListing = resolve
    }))
    const adapter: FileManagerAdapter = {
      pathStyle: 'posix',
      list,
    }

    render(
      <FileManager
        adapter={adapter}
        cache={false}
        initialPath="/tmp"
        showTree={false}
      />,
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Loading')
    expect(screen.queryByText('This directory is empty')).not.toBeInTheDocument()

    await act(async () => {
      finishListing(fileListing())
    })

    expect(await screen.findByText('report.txt')).toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('renders restored cache immediately and revalidates it with a fresh listing', async () => {
    let finishListing!: (listing: FileListing) => void
    const list = vi.fn((_path: string, context: { fresh?: boolean }) => {
      expect(context.fresh).toBe(true)
      return new Promise<FileListing>((resolve) => {
        finishListing = resolve
      })
    })
    const adapter: FileManagerAdapter = { pathStyle: 'posix', list }
    const cachedFile = {
      id: '/tmp/stale.txt',
      fullPath: '/tmp/stale.txt',
      name: 'stale.txt',
      isDirectory: false,
    }
    const cache = {
      load: vi.fn().mockResolvedValue({
        version: FILE_MANAGER_SNAPSHOT_VERSION,
        savedAt: Date.now(),
        currentPath: '/tmp',
        expandedPaths: ['/tmp'],
        viewMode: 'list' as const,
        data: {
          treeData: [{
            id: '/tmp',
            fullPath: '/tmp',
            name: '/tmp',
            isDirectory: true,
            children: [],
          }],
          expandedNodes: ['/tmp'],
          currentPath: '/tmp',
          currentDirPath: '/tmp',
          currentDirFiles: [cachedFile],
          pathInputValue: '/tmp',
          viewMode: 'list',
        },
      }),
      save: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    }

    render(
      <FileManager
        adapter={adapter}
        cache={cache}
        initialPath="/tmp"
        scopeKey="cache-revalidation-test"
        showTree={false}
      />,
    )

    expect(await screen.findByText('stale.txt')).toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(1)

    await act(async () => {
      finishListing(fileListing('fresh.txt'))
    })

    expect(await screen.findByText('fresh.txt')).toBeInTheDocument()
    expect(screen.queryByText('stale.txt')).not.toBeInTheDocument()
  })

  it('requires the destructive confirmation before deleting', async () => {
    const remove = vi.fn().mockResolvedValue(undefined)
    const adapter: FileManagerAdapter = {
      pathStyle: 'posix',
      list: vi.fn().mockResolvedValue(fileListing()),
      remove,
    }

    render(
      <FileManager
        adapter={adapter}
        cache={false}
        initialPath="/tmp"
        showTree={false}
      />,
    )

    fireEvent.contextMenu(await screen.findByText('report.txt'))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    expect(remove).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('dialog')
    const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(remove).not.toHaveBeenCalled()

    fireEvent.contextMenu(screen.getByText('report.txt'))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    const confirmationDialog = await screen.findByRole('dialog')
    const confirmButton = within(confirmationDialog).getByRole('button', { name: 'Delete' })
    expect(confirmButton).toHaveClass('bg-destructive')

    fireEvent.click(confirmButton)
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
  })

  it('performs one list request for each directory navigation', async () => {
    const list = vi.fn(async (path: string): Promise<FileListing> => {
      if (path === '/tmp') {
        return {
          path,
          entries: [{
            id: '/tmp/docs',
            path: '/tmp/docs',
            name: 'docs',
            kind: 'directory',
          }],
        }
      }
      return { path, entries: [] }
    })
    const adapter: FileManagerAdapter = { pathStyle: 'posix', list }

    render(
      <FileManager
        adapter={adapter}
        cache={false}
        initialPath="/tmp"
        showTree={false}
      />,
    )

    fireEvent.doubleClick(await screen.findByText('docs'))
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))

    expect(list.mock.calls.map(([path]) => path)).toEqual(['/tmp', '/tmp/docs'])
  })
})
