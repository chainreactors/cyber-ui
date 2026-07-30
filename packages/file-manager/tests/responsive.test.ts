import { describe, expect, it } from 'vitest'

import { isCompactFileManagerWidth } from '../src/hooks/useResizeObserver'
import { filterDirectoryTree } from '../src/utils/file-manager-utils'

describe('file manager container layout', () => {
  it.each([
    [0, false],
    [320, true],
    [767, true],
    [768, false],
    [960, false],
    [1440, false],
  ])('derives compact layout from container width %i', (width, compact) => {
    expect(isCompactFileManagerWidth(width)).toBe(compact)
  })

  it('keeps only directories in the navigation tree', () => {
    expect(filterDirectoryTree([
      {
        id: '/',
        name: '/',
        isDirectory: true,
        children: [
          {
            id: '/docs',
            name: 'docs',
            isDirectory: true,
            children: [
              { id: '/docs/guides', name: 'guides', isDirectory: true },
              { id: '/docs/readme.md', name: 'readme.md', isDirectory: false },
            ],
          },
          { id: '/archive.zip', name: 'archive.zip', isDirectory: false },
        ],
      },
    ])).toEqual([
      {
        id: '/',
        name: '/',
        isDirectory: true,
        children: [
          {
            id: '/docs',
            name: 'docs',
            isDirectory: true,
            children: [
              { id: '/docs/guides', name: 'guides', isDirectory: true },
            ],
          },
        ],
      },
    ])
  })
})
