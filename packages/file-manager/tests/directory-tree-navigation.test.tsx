import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useFileNodeRenderer } from '../src/components/FileNodeRenderer'

describe('directory tree navigation', () => {
  it('navigates from the row while keeping the disclosure button independent', () => {
    const navigateToPath = vi.fn()
    const onDirectoryNavigate = vi.fn()
    const toggle = vi.fn()
    const { result } = renderHook(() => useFileNodeRenderer({
      loadingNodes: new Set(),
      currentDirPath: '/',
      operatingFiles: new Set(),
      navigateToPath,
      generateContextMenu: () => [],
      matchedNodeIds: new Set(),
      treeSearchQuery: '',
      onDirectoryNavigate,
    }))
    const Renderer = result.current

    render(
      <Renderer
        node={{
          data: {
            id: '/docs',
            fullPath: '/docs',
            name: 'docs',
            isDirectory: true,
          },
          id: '/docs',
          isOpen: false,
          toggle,
        } as never}
        style={{}}
        tree={{} as never}
      />,
    )

    fireEvent.click(screen.getByText('docs'))
    expect(navigateToPath).toHaveBeenCalledWith('/docs')
    expect(onDirectoryNavigate).toHaveBeenCalledOnce()

    navigateToPath.mockClear()
    onDirectoryNavigate.mockClear()
    fireEvent.click(screen.getByRole('button'))
    expect(toggle).toHaveBeenCalledOnce()
    expect(navigateToPath).not.toHaveBeenCalled()
    expect(onDirectoryNavigate).not.toHaveBeenCalled()
  })
})
