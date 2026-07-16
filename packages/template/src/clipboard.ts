type FocusableElement = {
  focus?: (options?: { preventScroll?: boolean }) => void
}

type CopyContainer = {
  appendChild: (node: Node) => unknown
}

type CopyTargetElement = FocusableElement & {
  closest?: (selector: string) => CopyContainer | null
}

type ClipboardDocumentLike = {
  activeElement?: Element | null
  body?: CopyContainer | null
  documentElement?: CopyContainer | null
  createElement?: (tagName: string) => HTMLTextAreaElement
  execCommand?: (command: string) => boolean
}

type ClipboardNavigatorLike = {
  clipboard?: {
    writeText?: (text: string) => Promise<void>
  }
}

type ClipboardWindowLike = {
  isSecureContext?: boolean
}

type ClipboardRuntime = {
  document?: ClipboardDocumentLike | null
  navigator?: ClipboardNavigatorLike | null
  window?: ClipboardWindowLike | null
}

function resolveClipboardRuntime(runtime?: ClipboardRuntime): Required<ClipboardRuntime> {
  return {
    document:
      runtime?.document !== undefined
        ? runtime.document
        : typeof document !== 'undefined'
          ? (document as ClipboardDocumentLike)
          : null,
    navigator:
      runtime?.navigator !== undefined
        ? runtime.navigator
        : typeof navigator !== 'undefined'
          ? (navigator as ClipboardNavigatorLike)
          : null,
    window:
      runtime?.window !== undefined
        ? runtime.window
        : typeof window !== 'undefined'
          ? (window as ClipboardWindowLike)
          : null,
  }
}

function focusWithoutScroll(target: FocusableElement | null | undefined) {
  if (!target?.focus) return

  try {
    target.focus({ preventScroll: true })
  } catch {
    target.focus()
  }
}

function resolveCopyContainer(
  activeElement: CopyTargetElement | null,
  runtimeDocument?: Pick<ClipboardDocumentLike, 'body' | 'documentElement'> | null,
): CopyContainer | null {
  const dialogContainer = activeElement?.closest?.("[role='dialog']")
  if (dialogContainer) return dialogContainer
  if (runtimeDocument?.body) return runtimeDocument.body
  if (runtimeDocument?.documentElement) return runtimeDocument.documentElement
  return null
}

export async function copyToClipboard(text: string, runtime?: ClipboardRuntime): Promise<boolean> {
  const resolvedRuntime = resolveClipboardRuntime(runtime)
  const runtimeDocument = resolvedRuntime.document

  if (!text || !runtimeDocument) return false

  const canUseClipboardApi =
    !!resolvedRuntime.window?.isSecureContext &&
    !!resolvedRuntime.navigator?.clipboard?.writeText

  if (canUseClipboardApi) {
    try {
      await resolvedRuntime.navigator!.clipboard!.writeText!(text)
      return true
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback...', err)
    }
  }

  const activeElement = (runtimeDocument.activeElement as CopyTargetElement | null) ?? null
  const copyContainer = resolveCopyContainer(activeElement, runtimeDocument)
  let textarea: HTMLTextAreaElement | null = null
  const cleanup = () => {
    if (textarea?.parentNode) {
      textarea.parentNode.removeChild(textarea)
    }
    focusWithoutScroll(activeElement)
  }

  try {
    if (!copyContainer || !runtimeDocument.createElement || !runtimeDocument.execCommand) return false

    textarea = runtimeDocument.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-999999px'
    textarea.style.top = '0'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    textarea.style.contain = 'strict'

    copyContainer.appendChild(textarea)
    focusWithoutScroll(textarea)
    textarea.select()
    textarea.setSelectionRange?.(0, text.length)

    const copied = runtimeDocument.execCommand('copy')
    cleanup()
    return copied
  } catch (err) {
    console.error('Copy failed:', err)
    cleanup()
    return false
  }
}
