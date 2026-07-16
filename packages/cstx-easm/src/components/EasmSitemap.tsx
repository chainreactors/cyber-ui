import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, Folder, FolderOpen, File, CornerDownRight } from 'lucide-react'
import { cn } from '@cyber/theme'
import type { Url } from '../types'
import { type PathNode, buildPathTree, collectFolderIDs, pathFileName } from '../lib/pathTree'
import { statusCodeTone, badgeToneClass } from '../lib/tones'

export function EasmSitemap({ urls }: { urls: Url[] }) {
  const tree = useMemo(() => buildPathTree(urls), [urls])
  const folderIDs = useMemo(() => collectFolderIDs(tree), [tree])
  const [openIDs, setOpenIDs] = useState<Set<string>>(() => new Set(folderIDs))

  useEffect(() => { setOpenIDs(new Set(collectFolderIDs(tree))) }, [tree])

  const toggle = (id: string) =>
    setOpenIDs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-muted/10">
      {folderIDs.length > 0 && (
        <div className="flex items-center justify-end gap-1 border-b border-border/60 px-2 py-1">
          <button type="button" className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setOpenIDs(new Set(folderIDs))}>
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setOpenIDs(new Set())}>
            <Folder className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div>
        {tree.map((node) => (
          <TreeNode key={node.id} node={node} depth={0} openIDs={openIDs} onToggle={toggle} />
        ))}
      </div>
    </div>
  )
}

function TreeNode({ node, depth, openIDs, onToggle }: { node: PathNode; depth: number; openIDs: Set<string>; onToggle: (id: string) => void }) {
  const isFolder = node.children.length > 0
  const isOpen = openIDs.has(node.id)
  const paddingLeft = `${0.6 + Math.min(depth, 4) * 1.15}rem`

  if (isFolder) {
    const count = node.children.length + node.urls.length
    return (
      <div>
        <button type="button" aria-expanded={isOpen} className="flex w-full items-center gap-2 py-1.5 pr-3 text-left text-xs hover:bg-secondary/40" style={{ paddingLeft }} onClick={() => onToggle(node.id)}>
          <ChevronRight className={cn('h-3 w-3 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
          {isOpen ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/80" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <span className="min-w-0 flex-1 truncate font-mono text-foreground">{node.name}</span>
          <span className="shrink-0 text-muted-foreground">{count}</span>
        </button>
        {isOpen && (
          <div>
            {node.urls.map((url, idx) => <UrlEntry key={`${url.cstx_id}:${idx}`} url={url} depth={depth + 1} />)}
            {node.children.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} openIDs={openIDs} onToggle={onToggle} />)}
          </div>
        )}
      </div>
    )
  }

  return <>{node.urls.map((url, idx) => <UrlEntry key={`${url.cstx_id}:${idx}`} url={url} depth={depth} />)}</>
}

function UrlEntry({ url, depth }: { url: Url; depth: number }) {
  const paddingLeft = `${0.6 + Math.min(depth, 4) * 1.15}rem`
  const filename = pathFileName(url)
  const statusCode = url.status_code != null && url.status_code > 0 ? String(url.status_code) : ''

  return (
    <div className="flex items-center gap-2 py-1.5 pr-3 text-xs hover:bg-secondary/30" style={{ paddingLeft }}>
      <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-mono text-foreground">{filename}</span>
      {url.title && <span className="hidden min-w-0 truncate text-muted-foreground sm:inline">{url.title}</span>}
      {url.redirect_url && <span title={`-> ${url.redirect_url}`} className="shrink-0 text-muted-foreground/60"><CornerDownRight className="h-3 w-3" /></span>}
      {url.content_type && <span className="shrink-0 rounded-[3px] px-1 py-px font-mono text-[10px] font-semibold uppercase bg-secondary text-muted-foreground">{url.content_type}</span>}
      {statusCode && <span className={cn('shrink-0 rounded-[3px] px-1 py-px font-mono text-[10px] font-semibold', badgeToneClass[statusCodeTone(statusCode)])}>{statusCode}</span>}
    </div>
  )
}
