/** Raw request/response evidence already carried by CSTX vulnerabilities. */
export function HttpEvidenceView({ request, response, requestTitle = 'Request', responseTitle = 'Response' }: {
  request?: string
  response?: string
  requestTitle?: string
  responseTitle?: string
}) {
  return <div className="mt-2 max-h-96 overflow-auto rounded-md border border-border bg-background/50 p-3 text-muted-foreground" data-testid="http-evidence">
    {([[requestTitle, request], [responseTitle, response]] as const).map(([title, content], index) => content && <div key={index} className="mb-3 last:mb-0">
      <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground/70">{title}</div>
      <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">{content}</pre>
    </div>)}
  </div>
}
