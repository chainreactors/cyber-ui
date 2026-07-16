import { useState, useEffect, useMemo, type MouseEvent } from 'react'
import type { SCOPortNode } from '../types'
import { EasmPortLine } from './EasmPortLine'
import { EasmSitemap } from './EasmSitemap'
import { EasmVulnList } from './EasmVulnCard'

type Panel = { id: string; label: string; count: number; preferred: boolean; render: () => JSX.Element }

export function EasmPortRow({ node, sitemapLabel = 'Sitemap', vulnsLabel = 'Vulns' }: { node: SCOPortNode; sitemapLabel?: string; vulnsLabel?: string }) {
  const hasSitemap = node.urls.length > 0
  const hasVulns = node.vulns.length > 0
  const expandable = hasSitemap || hasVulns
  const [open, setOpen] = useState(true)

  const panels = useMemo<Panel[]>(() => {
    const p: Panel[] = []
    if (hasSitemap) p.push({ id: 'sitemap', label: sitemapLabel, count: node.urls.length, preferred: true, render: () => <EasmSitemap urls={node.urls} /> })
    if (hasVulns) p.push({ id: 'vulns', label: vulnsLabel, count: node.vulns.length, preferred: !hasSitemap, render: () => <EasmVulnList vulns={node.vulns} /> })
    return p
  }, [hasSitemap, hasVulns, node.urls, node.vulns, sitemapLabel, vulnsLabel])

  const [activePanelID, setActivePanelID] = useState(() => panels.find((p) => p.preferred)?.id || panels[0]?.id)
  const activePanel = panels.find((p) => p.id === activePanelID) || panels[0]

  useEffect(() => {
    if (!panels.some((p) => p.id === activePanelID)) setActivePanelID(panels.find((p) => p.preferred)?.id || panels[0]?.id)
  }, [activePanelID, panels])

  const selectPanel = (id: string) => (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); setActivePanelID(id); setOpen(true) }

  if (!expandable) {
    return <div className="py-3 first:pt-0 last:pb-0"><EasmPortLine node={node} /></div>
  }

  return (
    <details className="group/service py-3 first:pt-0 last:pb-0" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <EasmPortLine node={node} expandable />
      </summary>
      {panels.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-4 border-b border-border/50 sm:ml-6">
          {panels.map((panel) => (
            <button key={panel.id} type="button" onClick={selectPanel(panel.id)} className={`pb-1.5 text-xs font-medium transition-colors border-b-2 ${open && activePanel?.id === panel.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {panel.label} {panel.count > 0 && <span className="ml-1 tabular-nums text-muted-foreground/70">{panel.count}</span>}
            </button>
          ))}
        </div>
      )}
      {activePanel && (
        <div className="mt-3 sm:ml-6">
          {panels.length <= 1 && (
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <span>{activePanel.label}</span>
              {activePanel.count > 0 && <span className="tabular-nums text-muted-foreground/70">{activePanel.count}</span>}
            </div>
          )}
          {activePanel.render()}
        </div>
      )}
    </details>
  )
}
