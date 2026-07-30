import { describe, expect, it } from 'vitest'

import {
  FileManagerError,
  validateFileListing,
  type FileListing,
} from '../src/contracts'

const validListing: FileListing = {
  path: '/tmp',
  entries: [{
    id: '/tmp/report.txt',
    path: '/tmp/report.txt',
    name: 'report.txt',
    kind: 'file',
    sizeBytes: 42,
    modifiedAt: 1_725_000_000_000,
  }],
}

describe('file manager data contract', () => {
  it('accepts canonical entries with raw byte sizes', () => {
    expect(validateFileListing(validListing, 'posix')).toEqual(validListing)
  })

  it('rejects display strings and negative sizes', () => {
    expect(() => validateFileListing({
      ...validListing,
      entries: [{ ...validListing.entries[0], sizeBytes: -1 }],
    }, 'posix')).toThrow(FileManagerError)

    expect(() => validateFileListing({
      ...validListing,
      entries: [{ ...validListing.entries[0], sizeBytes: '42 KB' as never }],
    }, 'posix')).toThrow(FileManagerError)
  })

  it('rejects entries whose path is not canonical for the file space', () => {
    expect(() => validateFileListing({
      ...validListing,
      entries: [{ ...validListing.entries[0], path: '/tmp/../report.txt' }],
    }, 'posix')).toThrow(/canonical/i)
  })

  it('rejects conflicting listing and entry paths', () => {
    expect(() => validateFileListing({
      path: '/tmp',
      entries: [{ ...validListing.entries[0], path: '/other/report.txt' }],
    }, 'posix')).toThrow(/listing path/i)
  })
})
