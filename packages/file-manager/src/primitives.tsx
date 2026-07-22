import React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from './class-names'
import { CheckCircle2, ChevronRight, X } from './icons'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'soft'
  size?: 'default' | 'sm' | 'xs' | 'lg' | 'icon' | 'icon-sm' | 'icon-xs'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
    soft: 'bg-primary/10 text-primary hover:bg-primary/15',
  }
  const sizes = {
    default: 'h-10 px-4 py-2', sm: 'h-9 rounded-md px-3', xs: 'h-6 px-2 text-[10px]',
    lg: 'h-11 px-8', icon: 'h-10 w-10', 'icon-sm': 'h-8 w-8', 'icon-xs': 'h-7 w-7',
  }
  return <button ref={ref} className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)} {...props} />
})
Button.displayName = 'Button'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
))
Input.displayName = 'Input'

export const Separator = React.forwardRef<React.ElementRef<typeof SeparatorPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root ref={ref} decorative={decorative} orientation={orientation} className={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)} {...props} />
))
Separator.displayName = 'Separator'

export const Tooltip = (props: React.ComponentProps<typeof TooltipPrimitive.Root>) => <TooltipPrimitive.Provider delayDuration={250}><TooltipPrimitive.Root {...props} /></TooltipPrimitive.Provider>
export const TooltipTrigger = TooltipPrimitive.Trigger
export const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal><TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn('z-[80] rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md', className)} {...props} /></TooltipPrimitive.Portal>
))
TooltipContent.displayName = 'TooltipContent'

export const Dialog = DialogPrimitive.Root
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideCloseButton?: boolean }>(({ className, children, hideCloseButton, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
    <DialogPrimitive.Content ref={ref} className={cn('fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-xl', className)} {...props}>
      {children}
      {!hideCloseButton && <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"><X className="h-4 w-4" /><span className="sr-only">Close</span></DialogPrimitive.Close>}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = 'DialogContent'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'left' | 'right' | 'top' | 'bottom' }>(({ className, children, side = 'right', ...props }, ref) => {
  const sides = { left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r', right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l', top: 'inset-x-0 top-0 border-b', bottom: 'inset-x-0 bottom-0 border-t' }
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" /><DialogPrimitive.Content ref={ref} className={cn('fixed z-50 bg-background p-6 shadow-xl', sides[side], className)} {...props}>{children}<DialogPrimitive.Close className="absolute right-4 top-4 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>
})
SheetContent.displayName = 'SheetContent'

export const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(({ className, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root ref={ref} checked={checked} className={cn('peer h-4 w-4 shrink-0 rounded-sm border border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground', className)} {...props}>
    <CheckboxPrimitive.Indicator className="flex items-center justify-center"><CheckCircle2 className="h-3 w-3" /></CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = 'Checkbox'

export const ContextMenu = ContextMenuPrimitive.Root
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger
export const ContextMenuSub = ContextMenuPrimitive.Sub
export const ContextMenuSubTrigger = React.forwardRef<React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger>>(({ className, children, ...props }, ref) => <ContextMenuPrimitive.SubTrigger ref={ref} className={cn('flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent', className)} {...props}>{children}<ChevronRight className="ml-auto h-4 w-4" /></ContextMenuPrimitive.SubTrigger>)
ContextMenuSubTrigger.displayName = 'ContextMenuSubTrigger'
export const ContextMenuSubContent = React.forwardRef<React.ElementRef<typeof ContextMenuPrimitive.SubContent>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>>(({ className, ...props }, ref) => <ContextMenuPrimitive.Portal><ContextMenuPrimitive.SubContent ref={ref} className={cn('z-50 min-w-32 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md', className)} {...props} /></ContextMenuPrimitive.Portal>)
ContextMenuSubContent.displayName = 'ContextMenuSubContent'
export const ContextMenuContent = React.forwardRef<React.ElementRef<typeof ContextMenuPrimitive.Content>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>>(({ className, ...props }, ref) => <ContextMenuPrimitive.Portal><ContextMenuPrimitive.Content ref={ref} className={cn('z-50 min-w-32 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md', className)} {...props} /></ContextMenuPrimitive.Portal>)
ContextMenuContent.displayName = 'ContextMenuContent'
export const ContextMenuItem = React.forwardRef<React.ElementRef<typeof ContextMenuPrimitive.Item>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>>(({ className, ...props }, ref) => <ContextMenuPrimitive.Item ref={ref} className={cn('relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} {...props} />)
ContextMenuItem.displayName = 'ContextMenuItem'
export const ContextMenuLabel = React.forwardRef<React.ElementRef<typeof ContextMenuPrimitive.Label>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label>>(({ className, ...props }, ref) => <ContextMenuPrimitive.Label ref={ref} className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)} {...props} />)
ContextMenuLabel.displayName = 'ContextMenuLabel'
export const ContextMenuSeparator = React.forwardRef<React.ElementRef<typeof ContextMenuPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>>(({ className, ...props }, ref) => <ContextMenuPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />)
ContextMenuSeparator.displayName = 'ContextMenuSeparator'
