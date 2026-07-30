import { describe, expect, it } from 'vitest'

import {
  createLocalStorageFileManagerCache,
  createMemoryFileManagerCache,
  type FileManagerSnapshot,
} from '../src/cache'

const snapshot: FileManagerSnapshot = {
  version: 1,
  savedAt: 1_725_000_000_000,
  currentPath: '/tmp',
  expandedPaths: ['/tmp'],
  viewMode: 'list',
  data: { currentDirFiles: [] },
}

describe('file manager cache adapters', () => {
  it('isolates memory snapshots by scope', async () => {
    const cache = createMemoryFileManagerCache()

    await cache.save('app:a:workspace:1', snapshot)

    expect(await cache.load('app:a:workspace:1')).toEqual(snapshot)
    expect(await cache.load('app:b:workspace:1')).toBeNull()
  })

  it('removes only the requested localStorage scope', async () => {
    const cache = createLocalStorageFileManagerCache({
      storage: window.localStorage,
      keyPrefix: 'test.file-manager',
    })
    await cache.save('scope-a', snapshot)
    await cache.save('scope-b', { ...snapshot, currentPath: '/var' })

    await cache.remove('scope-a')

    expect(await cache.load('scope-a')).toBeNull()
    expect((await cache.load('scope-b'))?.currentPath).toBe('/var')
  })

  it('safely discards snapshots from an unknown version', async () => {
    window.localStorage.setItem(
      'test.version.scope',
      JSON.stringify({ ...snapshot, version: 99 }),
    )
    const cache = createLocalStorageFileManagerCache({
      storage: window.localStorage,
      keyPrefix: 'test.version',
    })

    expect(await cache.load('scope')).toBeNull()
  })
})
