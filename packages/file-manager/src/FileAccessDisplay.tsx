import type { FileAccess } from '@cyber/aop'
import { DisclosureCard } from '@cyber/ui'
import { CircleX, FileText } from 'lucide-react'

const defaults = {
  access: 'File access', read: 'Read', write: 'Write', edit: 'Edit', create: 'Create', delete: 'Delete',
  size: 'Size', transferred: 'Transferred', edits: 'Edits', directory: 'Working directory',
  tool: 'Tool', snapshot: 'Shell snapshot', control: 'Control plane', unknown: 'Unknown source',
}

export function FileAccessDisplay({ access, labels, defaultExpanded = false }: { access: FileAccess; labels?: Partial<typeof defaults>; defaultExpanded?: boolean }) {
  const l = { ...defaults, ...labels }
  const operations = [l.access, l.read, l.write, l.edit, l.create, l.delete]
  const sources = [l.unknown, l.tool, l.snapshot, l.control]
  return <div data-testid="file-observation"><DisclosureCard defaultExpanded={defaultExpanded} header={<>
    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    <span className="shrink-0 rounded border border-border px-1.5 py-0.5">{operations[access.op] || l.access}</span>
    <span className="min-w-0 flex-1 truncate font-mono" title={access.path}>{access.path}</span>
    <span className="shrink-0 font-mono text-muted-foreground">{access.size.toString()} B</span>
    {access.error && <CircleX className="h-3 w-3 shrink-0 text-destructive" />}
  </>}>
    <div className="space-y-2 border-t border-border p-3 text-xs">
      <p className="text-muted-foreground">{sources[access.source] || l.unknown}
        {access.bytes > 0n && access.bytes !== access.size && ` · ${l.transferred}: ${access.bytes.toString()} B`}
        {access.edits > 0 && ` · ${l.edits}: ${access.edits}`}
      </p>
      {access.workDir && <p className="break-all text-muted-foreground">{l.directory}: <span className="font-mono">{access.workDir}</span></p>}
      {access.digest && <details className="text-muted-foreground"><summary className="cursor-pointer">SHA-256</summary><code className="break-all">{access.digest}</code></details>}
      {access.error && <p role="alert" className="break-words text-destructive">{access.error}</p>}
    </div>
  </DisclosureCard></div>
}
