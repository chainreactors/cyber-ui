import type { OperationContext } from './contracts'

let requestSequence = 0

interface ActiveRequest {
  controller: AbortController
  requestId: string
}

export interface ManagedRequest {
  context: OperationContext
  complete(): void
}

export class FileManagerRequestManager {
  private readonly active = new Map<string, ActiveRequest>()

  begin(key: string): ManagedRequest {
    this.active.get(key)?.controller.abort()

    const controller = new AbortController()
    const requestId = `file-manager-${Date.now()}-${++requestSequence}`
    const request = { controller, requestId }
    this.active.set(key, request)

    return {
      context: {
        signal: controller.signal,
        requestId,
      },
      complete: () => {
        if (this.active.get(key) === request) this.active.delete(key)
      },
    }
  }

  abort(key: string): void {
    this.active.get(key)?.controller.abort()
    this.active.delete(key)
  }

  abortAll(): void {
    for (const request of this.active.values()) request.controller.abort()
    this.active.clear()
  }
}
