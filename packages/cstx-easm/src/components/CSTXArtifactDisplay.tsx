import { useEffect, useState } from 'react'
import type { Artifact } from '@cyber/aop'
import { CSTXArtifactNormalizer } from '@cyber/cstx'
import { DisclosureCard } from '@cyber/ui'
import { Box, Loader2 } from 'lucide-react'
import type { SCONode } from '../types'
import { EasmResultFromNodes } from './EasmResultView'

const defaults = { loading: 'Loading assets', failed: 'Unable to parse this artifact', raw: 'Original record', hosts: 'Hosts', noHosts: 'No hosts' }
const parsed = new WeakMap<Artifact, Promise<SCONode[]>>()

function artifactNodes(artifact: Artifact): Promise<SCONode[]> {
  let promise = parsed.get(artifact)
  if (!promise) {
    promise = CSTXArtifactNormalizer.create().then(runtime => {
      try { return runtime.normalize({ artifact: artifact.tool, data: artifact.data }).nodes as unknown as SCONode[] }
      finally { runtime.close() }
    })
    parsed.set(artifact, promise)
  }
  return promise
}

export function CSTXArtifactDisplay({ artifact, defaultExpanded = false, anchorPrefix, labels }: {
  artifact: Artifact; defaultExpanded?: boolean; anchorPrefix?: string; labels?: Record<string, string>
}) {
  const l = { ...defaults, ...labels }
  return <div data-testid="cstx-observation"><DisclosureCard defaultExpanded={defaultExpanded} header={<>
    <Box className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono">CSTX · {artifact.tool}</span>
    <span className="min-w-0 flex-1 truncate" title={artifact.target}>{artifact.target}</span>
    <span className="shrink-0 text-muted-foreground">{artifact.kind}</span>
  </>}><ArtifactBody artifact={artifact} labels={l} anchorPrefix={anchorPrefix} /></DisclosureCard></div>
}

function ArtifactBody({ artifact, labels, anchorPrefix }: { artifact: Artifact; labels: typeof defaults; anchorPrefix?: string }) {
  const [nodes, setNodes] = useState<SCONode[]>()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setNodes(undefined); setError('')
    void artifactNodes(artifact).then(value => { if (active) setNodes(value) }).catch(cause => { if (active) setError(String(cause)) })
    return () => { active = false }
  }, [artifact])
  const raw = new TextDecoder().decode(artifact.data.subarray(0, 128 * 1024))
  return <div className="space-y-3 border-t border-border p-3">
    {!nodes && !error && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{labels.loading}</p>}
    {nodes && <EasmResultFromNodes nodes={nodes} anchorPrefix={anchorPrefix} labels={labels} compact />}
    {error && <p role="alert" className="break-words text-xs text-warning">{labels.failed}: {error}</p>}
    <details><summary className="cursor-pointer text-xs text-muted-foreground">{labels.raw}</summary><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs">{raw}{artifact.data.length > 128 * 1024 ? '\n…' : ''}</pre></details>
  </div>
}
