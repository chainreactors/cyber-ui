import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './dialog'
import { Button } from './button'

export interface ConfirmOptions {
  title?: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Style the confirm button as destructive (red) and keep initial focus off it. */
  destructive?: boolean
}

/**
 * App-wide default labels, overridable per call via {@link ConfirmOptions}. Pass
 * these once on the provider to localise the dialog — the component itself stays
 * i18n-agnostic (no react-i18next dependency), so any consumer can wire it to
 * whatever translation layer it uses, or none at all.
 */
export interface ConfirmLabels {
  title?: string
  confirm?: string
  cancel?: string
}

const DEFAULT_LABELS: Required<ConfirmLabels> = {
  title: 'Please confirm',
  confirm: 'Confirm',
  cancel: 'Cancel',
}

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * A single app-wide confirm dialog, exposed as a promise via `useConfirm()`. This
 * replaces the browser's native `window.confirm` — which can't be themed, breaks
 * the recon-deck design language, and can't emphasise the stakes of destructive
 * or billing-affecting actions. Call sites stay a one-liner:
 *   if (!(await confirm({ description, destructive: true }))) return
 */
export function ConfirmProvider({ children, labels }: { children: ReactNode; labels?: ConfirmLabels }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions>({})
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])

  const confirm = useCallback<ConfirmFn>((next = {}) => {
    setOpts(next)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  // settle both closes the dialog and resolves the awaiting caller. Fired by the
  // buttons and by Radix's onOpenChange (Esc / overlay click / X), so dismissing
  // any which way resolves to false rather than leaving the promise dangling.
  const settle = useCallback((value: boolean) => {
    setOpen(false)
    resolver.current?.(value)
    resolver.current = null
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(next) => { if (!next) settle(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{opts.title || l.title}</DialogTitle>
            {opts.description != null && (
              <DialogDescription className="whitespace-pre-line leading-relaxed">
                {opts.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => settle(false)}>
              {opts.cancelLabel || l.cancel}
            </Button>
            <Button
              type="button"
              variant={opts.destructive ? 'destructive' : 'default'}
              onClick={() => settle(true)}
            >
              {opts.confirmLabel || l.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
