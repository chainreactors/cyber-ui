import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from './icons'
import * as ResizablePrimitive from 'react-resizable-panels'
import { cn } from './class-names'
import {
  Button,
  Checkbox,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Separator,
  Sheet,
  SheetContent,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './primitives'
import { useFileManagerRuntime } from './runtime'

export {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Separator,
  Sheet,
  SheetContent,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
}

export function useToast() {
  const runtime = useFileManagerRuntime()
  return { toast: runtime.notify }
}

export function useIsMobile(breakpoint = 768): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [breakpoint])
  return mobile
}

const PanelGroupPrimitive = ResizablePrimitive.PanelGroup as unknown as React.ComponentType<any>
const PanelPrimitive = ResizablePrimitive.Panel as unknown as React.ComponentType<any>
const PanelResizeHandlePrimitive = ResizablePrimitive.PanelResizeHandle as unknown as React.ComponentType<any>

export function ResizablePanelGroup({ className, children, ...props }: { className?: string; children?: React.ReactNode; direction: 'horizontal' | 'vertical'; [key: string]: unknown }) {
  return <PanelGroupPrimitive className={cn('flex h-full w-full', className)} {...props}>{children}</PanelGroupPrimitive>
}
export function ResizablePanel({ children, ...props }: { children?: React.ReactNode; defaultSize?: number; minSize?: number; maxSize?: number; [key: string]: unknown }) {
  return <PanelPrimitive {...props}>{children}</PanelPrimitive>
}
export function ResizableHandle({ className, ...props }: { className?: string; [key: string]: unknown }) {
  return <PanelResizeHandlePrimitive className={cn('relative w-px bg-border after:absolute after:inset-y-0 after:-left-1 after:w-2', className)} {...props} />
}

export interface ContextMenuAction {
  id: string
  label: string
  icon?: React.ReactNode
  shortcut?: string
  variant?: 'default' | 'danger' | 'success'
  disabled?: boolean
  onClick?: () => void
  onSelect?: () => void
  children?: ContextMenuAction[]
}

export interface ContextMenuSection {
  label?: string
  actions: ContextMenuAction[]
}

export function ContextMenuBuilder({ sections, children, className }: {
  sections: ContextMenuSection[] | (() => ContextMenuSection[])
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const effective = typeof sections === 'function' ? (open ? sections() : []) : sections

  const renderAction = (action: ContextMenuAction): React.ReactNode => {
    if (action.children?.length) {
      return (
        <ContextMenuSub key={action.id}>
          <ContextMenuSubTrigger disabled={action.disabled}>
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>{action.children.map(renderAction)}</ContextMenuSubContent>
        </ContextMenuSub>
      )
    }
    return (
      <ContextMenuItem
        key={action.id}
        disabled={action.disabled}
        className={cn(action.variant === 'danger' && 'text-destructive focus:text-destructive')}
        onSelect={() => window.setTimeout(() => (action.onSelect || action.onClick)?.(), 0)}
      >
        {action.icon && <span className="mr-2 flex h-4 w-4 items-center justify-center">{action.icon}</span>}
        <span className="flex-1">{action.label}</span>
        {action.shortcut && <span className="ml-4 text-xs text-muted-foreground">{action.shortcut}</span>}
      </ContextMenuItem>
    )
  }

  return (
    <ContextMenu onOpenChange={setOpen}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className={className}>
        {effective.map((section, index) => (
          <React.Fragment key={`${section.label || 'section'}-${index}`}>
            {section.label && <ContextMenuLabel>{section.label}</ContextMenuLabel>}
            {section.actions.map(renderAction)}
            {index < effective.length - 1 && <ContextMenuSeparator />}
          </React.Fragment>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export const Table = forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement> & { fixed?: boolean }>(({ className, fixed, style, ...props }, ref) => (
  <div className="relative w-full overflow-auto"><table ref={ref} className={cn('w-full caption-bottom text-sm', className)} style={{ tableLayout: fixed ? 'fixed' : undefined, ...style }} {...props} /></div>
))
Table.displayName = 'Table'
export const TableHeader = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />)
TableHeader.displayName = 'TableHeader'
export const TableBody = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />)
TableBody.displayName = 'TableBody'
export const TableRow = forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => <tr ref={ref} className={cn('border-b transition-colors', className)} {...props} />)
TableRow.displayName = 'TableRow'
export const TableHead = forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => <th ref={ref} className={cn('relative h-10 px-3 text-left align-middle font-medium text-muted-foreground', className)} {...props} />)
TableHead.displayName = 'TableHead'
export const TableCell = forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => <td ref={ref} className={cn('p-3 align-middle', className)} {...props} />)
TableCell.displayName = 'TableCell'

export interface ResizableColumnDef {
  key: string
  initialWidthPct: number
  minWidth?: number
  fill?: boolean
}

export function useColumnResize({ columns, tableRef }: {
  columns: ResizableColumnDef[]
  tableRef: React.RefObject<HTMLTableElement | null>
}) {
  const [resizingKey, setResizingKey] = useState<string | null>(null)
  const widths = useRef<Record<string, number>>({})

  const getColumnStyle = useCallback((key: string, fallback: string) => ({ width: widths.current[key] ? `${widths.current[key]}px` : fallback }), [])
  const getResizeHandler = useCallback((key: string) => ({
    isResizing: resizingKey === key,
    onMouseDown: (event: React.MouseEvent) => {
      event.preventDefault()
      const header = (event.currentTarget as HTMLElement).closest('th')
      const start = event.clientX
      const startWidth = header?.getBoundingClientRect().width || 120
      const minimum = columns.find((column) => column.key === key)?.minWidth || 40
      setResizingKey(key)
      const move = (next: MouseEvent) => {
        const width = Math.max(minimum, startWidth + next.clientX - start)
        widths.current[key] = width
        tableRef.current?.style.setProperty(`--col-${key}`, `${width}px`)
        if (header) header.style.width = `${width}px`
      }
      const up = () => {
        setResizingKey(null)
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    },
  }), [columns, resizingKey, tableRef])

  return { columnWidths: widths.current, getColumnStyle, getResizeHandler, isResizing: resizingKey !== null }
}

export function ColumnResizeHandle({ onMouseDown, isResizing }: { onMouseDown: (event: React.MouseEvent) => void; isResizing?: boolean }) {
  return <div role="separator" aria-orientation="vertical" onMouseDown={onMouseDown} className="absolute right-0 top-[20%] z-10 flex h-[60%] w-2 cursor-col-resize justify-center"><div className={cn('h-full w-px bg-border', isResizing && 'w-0.5 bg-primary')} /></div>
}

export function SortableTableHead<K extends string>({ label, sortKey, currentSortKey, currentDirection, onSort }: {
  label: string
  sortKey: K
  currentSortKey: K
  currentDirection: 'asc' | 'desc'
  onSort: (key: K) => void
}) {
  const active = sortKey === currentSortKey
  return (
    <button type="button" onClick={() => onSort(sortKey)} className="group flex items-center gap-1.5 whitespace-nowrap">
      {label}
      {active ? (currentDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-60" />}
    </button>
  )
}

export const compactTableClasses = {
  tableHeader: 'h-10 border-b border-border bg-muted/30 hover:bg-muted/50',
  tableHead: 'h-10 px-3 text-sm font-normal text-left text-muted-foreground bg-muted/30',
  tableRow: 'cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/30',
  tableCell: 'p-3 text-sm text-muted-foreground',
}

export function FormDialog({ open, onOpenChange, title, description, children, onSubmit, onCancel, submitText = 'Confirm', cancelText = 'Cancel', submitDisabled, isSubmitting, maxWidth = 'lg', hideFooter }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  onSubmit?: () => void
  onCancel?: () => void
  submitText?: string
  cancelText?: string
  submitDisabled?: boolean
  isSubmitting?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  hideFooter?: boolean
}) {
  const maxWidths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidths[maxWidth]}>
        <form onSubmit={(event) => { event.preventDefault(); onSubmit?.() }}>
          <DialogHeader><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
          <div className="py-4">{children}</div>
          {!hideFooter && <DialogFooter><Button type="button" variant="outline" onClick={() => { onCancel?.(); onOpenChange(false) }} disabled={isSubmitting}>{cancelText}</Button><Button type="submit" disabled={submitDisabled || isSubmitting}>{isSubmitting ? 'Processing…' : submitText}</Button></DialogFooter>}
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const Progress = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: number }>(({ className, value = 0, ...props }, ref) => (
  <div ref={ref} className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)} {...props}><div className="h-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
))
Progress.displayName = 'Progress'

export const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => <label ref={ref} className={cn('text-sm font-normal leading-none', className)} {...props} />)
Label.displayName = 'Label'
