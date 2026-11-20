/**
 * Copy text in browsers that expose the async Clipboard API as well as in
 * plain-http/private-host deployments where that API is unavailable.
 *
 * `source` identifies the control that initiated the copy. When it lives in a
 * focus-trapped dialog, the temporary textarea must be mounted in that dialog
 * for `execCommand('copy')` to see the selection.
 */
export async function copyToClipboard(text: string, source?: Element | null): Promise<boolean> {
  if (!text) return false

  let secure = false
  try {
    secure = typeof window !== 'undefined' && window.isSecureContext
  } catch {
    // Some embedded hosts expose security state through a throwing getter.
  }
  if (secure && typeof navigator !== 'undefined') {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      // Permissions can still reject the async API. Try the legacy path below.
    }
  }

  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false

  const activeElement = document.activeElement as HTMLElement | null
  let dialog: HTMLElement | null = null
  try {
    dialog =
      (source?.closest?.("[role='dialog']") as HTMLElement | null) ??
      (activeElement?.closest?.("[role='dialog']") as HTMLElement | null)
  } catch {
    // An unusual host (for example a minimal embedded DOM) may not implement
    // `closest`; the document body remains a valid fallback container.
  }
  const host = dialog ?? document.body ?? document.documentElement
  if (!host) return false

  let textarea: HTMLTextAreaElement | null = null
  try {
    textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.setAttribute('aria-hidden', 'true')
    textarea.tabIndex = -1
    textarea.style.cssText =
      'position:fixed;top:0;left:-9999px;opacity:0;pointer-events:none;contain:strict'
    host.appendChild(textarea)

    try {
      textarea.focus({ preventScroll: true })
    } catch {
      textarea.focus()
    }
    textarea.select()
    try {
      textarea.setSelectionRange(0, text.length)
    } catch {
      // `select()` is sufficient on older WebViews that reject a range on a
      // readonly textarea.
    }
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea?.parentNode?.removeChild(textarea)
    if (activeElement?.isConnected && activeElement !== document.body) {
      try {
        activeElement.focus({ preventScroll: true })
      } catch {
        activeElement.focus()
      }
    }
  }
}
