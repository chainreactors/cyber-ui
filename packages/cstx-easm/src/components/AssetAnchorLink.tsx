import { Link2 } from 'lucide-react'

export function AssetAnchorLink({ id, label }: { id: string; label: string }) {
  return <a href={`#${id}`} aria-label={label} title={label} onClick={event => event.stopPropagation()}
    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 hover:bg-accent hover:text-foreground hover:opacity-100">
    <Link2 className="h-3 w-3" />
  </a>
}
