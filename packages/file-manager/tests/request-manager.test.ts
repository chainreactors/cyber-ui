import { describe, expect, it } from 'vitest'

import { FileManagerRequestManager } from '../src/request-manager'

describe('file manager request manager', () => {
  it('aborts the previous request for the same key', () => {
    const manager = new FileManagerRequestManager()
    const first = manager.begin('list:/tmp')
    const second = manager.begin('list:/tmp')

    expect(first.context.signal.aborted).toBe(true)
    expect(second.context.signal.aborted).toBe(false)
    expect(first.context.requestId).not.toBe(second.context.requestId)
  })

  it('aborts every in-flight operation when the data source changes', () => {
    const manager = new FileManagerRequestManager()
    const list = manager.begin('list:/tmp')
    const upload = manager.begin('upload:1')

    manager.abortAll()

    expect(list.context.signal.aborted).toBe(true)
    expect(upload.context.signal.aborted).toBe(true)
  })

  it('can abort one request without affecting unrelated operations', () => {
    const manager = new FileManagerRequestManager()
    const list = manager.begin('list:/tmp')
    const upload = manager.begin('upload:1')

    manager.abort('upload:1')

    expect(list.context.signal.aborted).toBe(false)
    expect(upload.context.signal.aborted).toBe(true)
  })

  it('does not abort a newer request when an older request completes late', () => {
    const manager = new FileManagerRequestManager()
    const first = manager.begin('list:/tmp')
    const second = manager.begin('list:/tmp')

    first.complete()

    expect(second.context.signal.aborted).toBe(false)
  })
})
