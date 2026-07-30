import { describe, expect, it } from 'vitest'

import {
  getPathStrategy,
  isSameOrDescendantPath,
  pathsEqual,
  pathsOverlap,
} from '../src/path-strategy'

describe('file manager path strategies', () => {
  it('normalizes and bounds POSIX paths at root', () => {
    const path = getPathStrategy('posix')

    expect(path.normalize('/var//tmp/../log')).toBe('/var/log')
    expect(path.join('/var', 'log/app.log')).toBe('/var/log/app.log')
    expect(path.parent('/var/log')).toBe('/var')
    expect(path.parent('/')).toBe('/')
    expect(path.root('/var/log')).toBe('/')
  })

  it('preserves Windows drive roots', () => {
    const path = getPathStrategy('windows')

    expect(path.normalize('c:\\Temp\\\\logs\\')).toBe('C:/Temp/logs')
    expect(path.join('C:', 'Temp/app.log')).toBe('C:/Temp/app.log')
    expect(path.parent('C:/Temp')).toBe('C:/')
    expect(path.parent('C:/')).toBe('C:/')
    expect(path.root('C:/Temp/app.log')).toBe('C:/')
  })

  it('does not allow UNC parents to escape the share root', () => {
    const path = getPathStrategy('windows')

    expect(path.normalize('\\\\server\\share\\folder\\file.txt')).toBe('//server/share/folder/file.txt')
    expect(path.root('//server/share/folder/file.txt')).toBe('//server/share')
    expect(path.parent('//server/share/folder')).toBe('//server/share')
    expect(path.parent('//server/share')).toBe('//server/share')
    expect(path.join('//server/share', 'folder/file.txt')).toBe('//server/share/folder/file.txt')
  })

  it('detects exact and ancestor mutation path conflicts across path styles', () => {
    expect(pathsEqual('c:\\Temp\\Folder', 'C:/temp/folder', 'windows')).toBe(true)
    expect(pathsEqual('/tmp/Folder', '/tmp/folder', 'posix')).toBe(false)
    expect(pathsOverlap('/tmp/folder', '/tmp/folder/file.txt', 'posix')).toBe(true)
    expect(pathsOverlap('/tmp/a', '/tmp/b', 'posix')).toBe(false)
    expect(pathsOverlap('c:\\Temp\\Folder', 'C:/temp/folder/file.txt', 'windows')).toBe(true)
    expect(pathsOverlap('//server/share/a', '//server/share/b', 'windows')).toBe(false)
  })

  it('distinguishes descendants from ancestors for directory availability', () => {
    expect(isSameOrDescendantPath('/tmp/folder/file.txt', '/tmp/folder', 'posix')).toBe(true)
    expect(isSameOrDescendantPath('/tmp', '/tmp/folder', 'posix')).toBe(false)
  })
})
