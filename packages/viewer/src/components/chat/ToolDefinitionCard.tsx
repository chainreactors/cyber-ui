import type { ToolDefinition } from '@cyber/aop'
import { Terminal, Wrench } from 'lucide-react'
import { Badge, DisclosureCard } from '@cyber/ui'
import { formatArgs } from '../../lib/tool-utils'

export function ToolDefinitionCard({ name: toolName, description: toolDescription, usage, aliases = [], inputSchema, type, labels }: {
  name: string; description?: string; usage?: string; aliases?: readonly string[]
  inputSchema?: ToolDefinition['inputSchema']; type?: ToolDefinition['type']
  labels?: Partial<Record<'fallbackDescription' | 'usage' | 'descriptionLabel' | 'aliases' | 'inputSchema', string>>
}) {
  const defaults = { fallbackDescription: 'No description', usage: 'Usage', descriptionLabel: 'Description', aliases: 'Aliases', inputSchema: 'Input parameters' }
  const t = (key: keyof typeof defaults) => labels?.[key] || defaults[key]
  const name = toolName.replace(/^!/, '')
  const description = toolDescription || t('fallbackDescription')
  const command = toolName.startsWith('!')
  const Icon = command ? Terminal : Wrench

  return (
    <DisclosureCard
      className="border-border/70 bg-card shadow-soft"
      headerClassName="min-h-12"
      header={(
        <>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <code className="truncate font-mono text-xs font-semibold text-foreground">{name}</code>
              <Badge variant="muted" size="sm" className="shrink-0 py-0 font-mono font-normal">{command ? 'bash' : type || 'tool'}</Badge>
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{description}</span>
          </span>
        </>
      )}
      bodyClassName="border-t border-border/60 bg-muted/10"
    >
      <div className="space-y-4 p-4">
        {(command || usage) && <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('usage')}</p>
          <pre className="overflow-x-auto rounded-md border border-border/70 bg-background px-3 py-2 font-mono text-xs text-foreground">
            {usage || toolName}
          </pre>
        </div>}
        {inputSchema?.data.length ? <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('inputSchema')}</p>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/70 bg-background px-3 py-2 font-mono text-xs text-foreground">{formatArgs(new TextDecoder().decode(inputSchema.data))}</pre>
        </div> : null}
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('descriptionLabel')}</p>
          <p className="text-xs leading-relaxed text-foreground/85">{description}</p>
        </div>
        {aliases.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('aliases')}</p>
            <div className="flex flex-wrap gap-1.5">
              {aliases.map((alias) => (
                <Badge key={alias} variant="outline" size="sm" className="font-mono font-normal">{alias}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </DisclosureCard>
  )
}
