import { Component, Fragment, useMemo, useState, type ReactNode } from 'react'
import type { Element, ElementContent, Nodes, Root, RootContent } from 'hast'
import { cn } from '@cyber/theme'
import { Badge, Callout, type BadgeProps, type CalloutTone } from '@cyber/ui'
import type { TrafficHttpView } from '@cyber/traffic'
import { parseHttpExchange } from './http'

// A report reaches this renderer as an already-sanitized hast tree: the owner of
// the document decides the security policy, and this package decides how the
// contract's components look and behave. Every adapter below is total — when a
// component's payload cannot be understood, it degrades to the semantic
// rendering of the same nodes rather than throwing.

type KnownReportComponentName =
  | 'report-header'
  | 'section'
  | 'finding-card'
  | 'severity-badge'
  | 'http-evidence'
  | 'data-table'
  | 'callout'
  | 'code-block'
  | 'markdown'
  | 'toc'

/** Severity maps onto the shared Badge vocabulary rather than new colours. */
const SEVERITY_VARIANT: Record<string, BadgeProps['variant']> = {
  critical: 'destructive',
  high: 'caution',
  medium: 'warning',
  low: 'info',
  info: 'muted',
}

// Theme colours are HSL triplets, so they need wrapping to be used as a value.
const SEVERITY_EDGE: Record<string, string> = {
  critical: 'hsl(var(--destructive))',
  high: 'hsl(var(--caution))',
  medium: 'hsl(var(--warning))',
  low: 'hsl(var(--info))',
  info: 'hsl(var(--border))',
}

/** The contract's tones, mapped onto the shared Callout vocabulary. */
const CALLOUT_TONE: Record<string, CalloutTone> = {
  note: 'info',
  info: 'info',
  warn: 'warning',
  danger: 'destructive',
}

interface Heading {
  id: string
  label: string
  level: number
}

interface RenderContext {
  headingIds: WeakMap<Element, string>
  sectionHeadings: Heading[]
  headingsByLabel: Map<string, Heading[]>
  componentNames: ReadonlySet<string>
  renderHttpView?: (view: TrafficHttpView) => ReactNode
}

const HEADING = /^h([1-6])$/

function isElement(node: RootContent | ElementContent | undefined): node is Element {
  return !!node && node.type === 'element'
}

function textOf(node: Nodes): string {
  if (node.type === 'text') return node.value
  // Comments, doctypes, and raw nodes carry no report content.
  if (!('children' in node)) return ''
  return node.children.map(textOf).join('')
}

function stringProp(node: Element, name: string): string | undefined {
  const value = node.properties?.[name]
  return typeof value === 'string' ? value : undefined
}

/** `data-report-severity` reaches hast as `dataReportSeverity`. */
function reportAttr(node: Element, name: string): string | undefined {
  const key = `data-report-${name}`.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
  return stringProp(node, key)
}

function integer(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = integer(value)
  return parsed !== undefined && parsed > 0 ? parsed : undefined
}

/** Contract identity attributes stay on the DOM so exports and tests can see them. */
function passthroughProps(node: Element): Record<string, string> {
  const props: Record<string, string> = {}
  const id = stringProp(node, 'id')
  const title = stringProp(node, 'title')
  if (id) props.id = id
  if (title) props.title = title
  for (const [name, value] of Object.entries(node.properties ?? {})) {
    if (!name.startsWith('data') || typeof value !== 'string') continue
    props[name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)] = value
  }
  return props
}

function headingSlug(label: string, index: number): string {
  const slug = label
    .normalize('NFKC')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return slug || `report-section-${index + 1}`
}

function prepareContext(
  nodes: RootContent[],
  componentNames: readonly string[],
  renderHttpView?: (view: TrafficHttpView) => ReactNode,
): RenderContext {
  const headingIds = new WeakMap<Element, string>()
  const headings: Heading[] = []
  const usedIds = new Set<string>()

  const visit = (node: RootContent | ElementContent): void => {
    if (!isElement(node)) return
    const match = HEADING.exec(node.tagName)
    if (match) {
      const label = textOf(node).replace(/\s+/g, ' ').trim()
      const authored = stringProp(node, 'id')?.trim()
      let id = authored || headingSlug(label, headings.length)
      const base = id
      let suffix = 2
      while (usedIds.has(id)) id = `${base}-${suffix++}`
      usedIds.add(id)
      headingIds.set(node, id)
      headings.push({ id, label, level: Number(match[1]) })
    }
    node.children.forEach(visit)
  }

  nodes.forEach(visit)
  const headingsByLabel = new Map<string, Heading[]>()
  for (const heading of headings) {
    const matches = headingsByLabel.get(heading.label)
    if (matches) matches.push(heading)
    else headingsByLabel.set(heading.label, [heading])
  }
  return {
    headingIds,
    sectionHeadings: headings.filter((heading) => heading.level > 1),
    headingsByLabel,
    componentNames: new Set(componentNames),
    renderHttpView,
  }
}

// --- error boundary: one broken component must not blank the document ---

class ComponentBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// --- components ---

function renderNodes(nodes: (RootContent | ElementContent)[], context: RenderContext): ReactNode[] {
  return nodes.map((node, index) => <Fragment key={index}>{renderNode(node, context)}</Fragment>)
}

// Pretty-printed report HTML contains indentation text between table elements.
// Browsers ignore that formatting whitespace, but React renders it as a text
// child and warns because table, row-group, and row elements only accept their
// structural descendants.
function renderTableNodes(nodes: (RootContent | ElementContent)[], context: RenderContext): ReactNode[] {
  return renderNodes(
    nodes.filter((node) => node.type !== 'text' || node.value.trim() !== ''),
    context,
  )
}

/**
 * Evidence is shown verbatim rather than through a syntax highlighter: an HTTP
 * packet or shell transcript has no language to colour, and highlighting would
 * mean transforming bytes that the report exists to reproduce exactly.
 */
function EvidencePre({ node, label }: { node: Element; label?: string }) {
  const code = textOf(node)
  const [copied, setCopied] = useState(false)

  return (
    <div className="my-2 overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted px-3 py-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground">{label ?? 'Evidence'}</span>
        <button
          type="button"
          aria-label="Copy evidence"
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
        >
          {copied ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m5 12 4 4L19 6" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
      <pre
        {...passthroughProps(node)}
        className="m-0 max-h-[420px] overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs leading-[18px]"
      >
        {code}
      </pre>
    </div>
  )
}

function packetLabel(node: Element, index: number): string {
  const authored = reportAttr(node, 'label')?.trim()
  if (authored) return authored
  const part = reportAttr(node, 'part')?.toLowerCase()
  if (part === 'request') return 'Request'
  if (part === 'response') return 'Response'
  return `Evidence ${index + 1}`
}

/**
 * Verbatim packets upgrade to the shared traffic viewer when they parse as wire
 * format. Shell-captured evidence (a command plus its output) does not, and
 * renders as labelled code — the common case, not a failure path.
 */
function HttpEvidence({ node, context }: { node: Element; context: RenderContext }) {
  const packets = node.children.filter(isElement).filter((child) => child.tagName === 'pre')
  const intro = node.children.filter((child) => !(isElement(child) && child.tagName === 'pre'))

  const view = useMemo(() => {
    const request = packets.find((packet) => reportAttr(packet, 'part') === 'request')
    const response = packets.find((packet) => reportAttr(packet, 'part') === 'response')
    if (!request) return null
    try {
      return parseHttpExchange(textOf(request), response ? textOf(response) : undefined)
    } catch {
      return null
    }
  }, [node])

  return (
    <section {...passthroughProps(node)} className="my-3" aria-label="HTTP evidence">
      {renderNodes(intro, context)}
      {view && context.renderHttpView ? (
        <div className="h-[420px] overflow-hidden rounded-md border border-border">
          {context.renderHttpView(view)}
        </div>
      ) : (
        packets.map((packet, index) => (
          <EvidencePre key={index} node={packet} label={packetLabel(packet, index)} />
        ))
      )}
    </section>
  )
}

function SeverityBadge({ node, context }: { node: Element; context: RenderContext }) {
  const severity = (reportAttr(node, 'severity') || 'info').toLowerCase()
  return (
    // The authored text is the badge label: rendering and Markdown export must
    // read the same, so no severity vocabulary is substituted here.
    <Badge variant={SEVERITY_VARIANT[severity] ?? 'muted'} size="sm" {...passthroughProps(node)}>
      {renderNodes(node.children, context)}
    </Badge>
  )
}

function FindingCard({ node, context }: { node: Element; context: RenderContext }) {
  const severity = (reportAttr(node, 'severity') || 'info').toLowerCase()
  return (
    <section
      {...passthroughProps(node)}
      className="my-3 rounded-lg border border-t-2 border-border bg-card px-4 py-3"
      style={{ borderTopColor: SEVERITY_EDGE[severity] ?? SEVERITY_EDGE.info }}
    >
      {renderNodes(node.children, context)}
    </section>
  )
}

function ReportTable({ node, context }: { node: Element; context: RenderContext }) {
  return (
    <div className="my-3 overflow-x-auto rounded-md border border-border">
      <table {...passthroughProps(node)} className="w-full border-collapse text-left text-xs">
        {renderTableNodes(node.children, context)}
      </table>
    </div>
  )
}

function ReportCallout({ node, context }: { node: Element; context: RenderContext }) {
  const tone = (reportAttr(node, 'tone') || 'note').toLowerCase()
  return (
    <Callout tone={CALLOUT_TONE[tone] ?? 'info'} className="my-2">
      <div {...passthroughProps(node)}>{renderNodes(node.children, context)}</div>
    </Callout>
  )
}

function hasDescendantTag(node: Element, tag: string): boolean {
  return node.children.some(
    (child) => isElement(child) && (child.tagName === tag || hasDescendantTag(child, tag)),
  )
}

function Toc({ node, context }: { node: Element; context: RenderContext }) {
  const labelIndexes = new Map<string, number>()
  const consumed = new Set<string>()
  let fallbackIndex = 0

  const takeExact = (label: string): Heading | undefined => {
    const matches = context.headingsByLabel.get(label)
    if (!matches) return undefined
    let index = labelIndexes.get(label) ?? 0
    while (index < matches.length && consumed.has(matches[index].id)) index += 1
    labelIndexes.set(label, index + 1)
    const heading = matches[index]
    if (heading) consumed.add(heading.id)
    return heading
  }

  const takeFallback = (): Heading | undefined => {
    while (
      fallbackIndex < context.sectionHeadings.length
      && consumed.has(context.sectionHeadings[fallbackIndex].id)
    ) fallbackIndex += 1
    const heading = context.sectionHeadings[fallbackIndex++]
    if (heading) consumed.add(heading.id)
    return heading
  }

  const renderEntry = (child: RootContent | ElementContent): ReactNode => {
    if (!isElement(child)) return renderNode(child, context)
    if (child.tagName === 'li' && !hasDescendantTag(child, 'a')) {
      const nested = child.children.filter(
        (item) => isElement(item) && (item.tagName === 'ol' || item.tagName === 'ul'),
      )
      const labelNodes = child.children.filter(
        (item) => !(isElement(item) && (item.tagName === 'ol' || item.tagName === 'ul')),
      )
      const label = labelNodes.map(textOf).join('').replace(/\s+/g, ' ').trim()
      const target = takeExact(label) ?? takeFallback()
      return (
        <li {...passthroughProps(child)}>
          {target ? (
            <a href={`#${target.id}`} className="text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
              {renderNodes(labelNodes, context)}
            </a>
          ) : (
            renderNodes(labelNodes, context)
          )}
          {nested.map((list, index) => <Fragment key={index}>{renderEntry(list)}</Fragment>)}
        </li>
      )
    }
    if (child.tagName === 'ol' || child.tagName === 'ul') {
      const ListTag = child.tagName
      return (
        <ListTag
          {...passthroughProps(child)}
          start={child.tagName === 'ol' ? integer(child.properties?.start) : undefined}
          className={cn('m-0 space-y-1 pl-5 text-xs', child.tagName === 'ol' ? 'list-decimal' : 'list-disc')}
        >
          {child.children.map((item, index) => <Fragment key={index}>{renderEntry(item)}</Fragment>)}
        </ListTag>
      )
    }
    return renderNode(child, context)
  }

  return (
    <nav
      {...passthroughProps(node)}
      aria-label={stringProp(node, 'title') || 'Report contents'}
      className="my-3 rounded-md border border-border bg-muted/40 px-4 py-3"
    >
      {node.children.map((child, index) => <Fragment key={index}>{renderEntry(child)}</Fragment>)}
    </nav>
  )
}

type ComponentRenderer = (node: Element, context: RenderContext) => ReactNode

const COMPONENT_RENDERERS: Record<KnownReportComponentName, ComponentRenderer> = {
  'report-header': (node, context) => (
    <header {...passthroughProps(node)} className="mb-4 border-b border-border pb-3">
      {renderNodes(node.children, context)}
    </header>
  ),
  section: (node, context) => (
    <section {...passthroughProps(node)} className="my-3">
      {renderNodes(node.children, context)}
    </section>
  ),
  'finding-card': (node, context) => <FindingCard node={node} context={context} />,
  'severity-badge': (node, context) => <SeverityBadge node={node} context={context} />,
  'http-evidence': (node, context) => <HttpEvidence node={node} context={context} />,
  'data-table': (node, context) => <ReportTable node={node} context={context} />,
  callout: (node, context) => <ReportCallout node={node} context={context} />,
  'code-block': (node) => <EvidencePre node={node} />,
  markdown: (node, context) => (
    <div {...passthroughProps(node)} className="my-2">
      {renderNodes(node.children, context)}
    </div>
  ),
  toc: (node, context) => <Toc node={node} context={context} />,
}

function isRegistered(value: string | undefined, context: RenderContext): value is KnownReportComponentName {
  return !!value
    && context.componentNames.has(value)
    && Object.prototype.hasOwnProperty.call(COMPONENT_RENDERERS, value)
}

/** The plain semantic rendering, also used as every component's failure fallback. */
function renderSemantic(node: Element, context: RenderContext): ReactNode {
  const props = passthroughProps(node)
  const children = () => renderNodes(node.children, context)
  const headingId = context.headingIds.get(node)

  switch (node.tagName) {
    case 'h1': return <h1 {...props} id={headingId} className="mb-2 mt-1 text-xl font-bold">{children()}</h1>
    case 'h2': return <h2 {...props} id={headingId} className="mb-2 mt-5 border-b border-border pb-1 text-base font-semibold">{children()}</h2>
    case 'h3': return <h3 {...props} id={headingId} className="mb-1.5 mt-4 text-sm font-semibold">{children()}</h3>
    case 'h4': return <h4 {...props} id={headingId} className="mb-1 mt-3 text-sm font-semibold">{children()}</h4>
    case 'h5': return <h5 {...props} id={headingId} className="mb-1 mt-2 text-xs font-semibold text-muted-foreground">{children()}</h5>
    case 'h6': return <h6 {...props} id={headingId} className="mb-1 mt-2 text-xs font-semibold text-muted-foreground">{children()}</h6>
    case 'p': return <p {...props} className="my-2 text-[13px] leading-relaxed">{children()}</p>
    case 'br': return <br {...props} />
    case 'wbr': return <wbr {...props} />
    case 'hr': return <hr {...props} className="my-4 border-border" />
    case 'strong':
    case 'b': return <strong {...props} className="font-semibold">{children()}</strong>
    case 'em':
    case 'i': return <em {...props} className="italic">{children()}</em>
    case 'code': return <code {...props} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children()}</code>
    case 'kbd': return <kbd {...props} className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-xs">{children()}</kbd>
    case 'samp': return <samp {...props} className="font-mono text-xs">{children()}</samp>
    case 'var': return <var {...props}>{children()}</var>
    case 'span': return <span {...props}>{children()}</span>
    case 'sup': return <sup {...props}>{children()}</sup>
    case 'sub': return <sub {...props}>{children()}</sub>
    case 'small': return <small {...props}>{children()}</small>
    case 'mark': return <mark {...props}>{children()}</mark>
    case 'abbr': return <abbr {...props}>{children()}</abbr>
    case 'time': return <time {...props} dateTime={stringProp(node, 'dateTime')}>{children()}</time>
    case 'cite': return <cite {...props}>{children()}</cite>
    case 'q': return <q {...props}>{children()}</q>
    case 's': return <s {...props}>{children()}</s>
    case 'del': return <del {...props}>{children()}</del>
    case 'ins': return <ins {...props}>{children()}</ins>
    case 'u': return <u {...props}>{children()}</u>
    case 'a': {
      const href = stringProp(node, 'href')
      if (!href) return <span {...props}>{children()}</span>
      const external = /^https?:\/\//i.test(href)
      return (
        <a
          {...props}
          href={href}
          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          className="text-primary underline-offset-2 hover:underline"
        >
          {children()}
        </a>
      )
    }
    case 'ul': return <ul {...props} className="my-2 list-disc space-y-1 pl-5 text-[13px]">{children()}</ul>
    case 'ol': return <ol {...props} start={integer(node.properties?.start)} className="my-2 list-decimal space-y-1 pl-5 text-[13px]">{children()}</ol>
    case 'li': return <li {...props}>{children()}</li>
    case 'dl': return <dl {...props} className="my-2 text-[13px]">{children()}</dl>
    case 'dt': return <dt {...props} className="mt-2 font-semibold">{children()}</dt>
    case 'dd': return <dd {...props} className="ml-4 text-muted-foreground">{children()}</dd>
    case 'blockquote': return <ReportCallout node={node} context={context} />
    case 'pre': return <EvidencePre node={node} />
    case 'table': return <ReportTable node={node} context={context} />
    case 'caption': return <caption {...props} className="px-3 py-2 text-left text-xs font-semibold">{children()}</caption>
    case 'colgroup': return <colgroup {...props}>{renderTableNodes(node.children, context)}</colgroup>
    case 'col': return <col {...props} span={positiveInteger(node.properties?.span)} />
    case 'thead': return <thead {...props} className="bg-muted text-xs font-semibold text-muted-foreground">{renderTableNodes(node.children, context)}</thead>
    case 'tbody': return <tbody {...props}>{renderTableNodes(node.children, context)}</tbody>
    case 'tfoot': return <tfoot {...props}>{renderTableNodes(node.children, context)}</tfoot>
    case 'tr': return <tr {...props} className="border-b border-border last:border-0">{renderTableNodes(node.children, context)}</tr>
    case 'th': {
      const scope = stringProp(node, 'scope')
      return (
        <th
          {...props}
          colSpan={positiveInteger(node.properties?.colSpan)}
          rowSpan={positiveInteger(node.properties?.rowSpan)}
          scope={/^(?:row|col|rowgroup|colgroup)$/.test(scope ?? '') ? (scope as 'row' | 'col' | 'rowgroup' | 'colgroup') : undefined}
          className="px-3 py-1.5 align-top font-semibold"
        >
          {children()}
        </th>
      )
    }
    case 'td': return <td {...props} colSpan={positiveInteger(node.properties?.colSpan)} rowSpan={positiveInteger(node.properties?.rowSpan)} className="px-3 py-1.5 align-top text-muted-foreground">{children()}</td>
    case 'details': return <details {...props} open={node.properties?.open === true} className="my-2 rounded-md border border-border bg-muted/40 px-3 py-2">{children()}</details>
    case 'summary': return <summary {...props} className="cursor-pointer text-xs font-semibold">{children()}</summary>
    case 'section': return <section {...props} className="my-3">{children()}</section>
    case 'header': return <header {...props} className="mb-4 border-b border-border pb-3">{children()}</header>
    case 'nav': return <nav {...props} className="my-3">{children()}</nav>
    case 'article': return <article {...props}>{children()}</article>
    case 'main': return <main {...props}>{children()}</main>
    case 'aside': return <aside {...props}>{children()}</aside>
    case 'footer': return <footer {...props}>{children()}</footer>
    case 'div': return <div {...props}>{children()}</div>
    case 'figure': return <figure {...props} className="my-3">{children()}</figure>
    case 'figcaption': return <figcaption {...props} className="mt-1 text-xs text-muted-foreground">{children()}</figcaption>
    case 'address': return <address {...props}>{children()}</address>
    // Unknown elements degrade transparently: their text and inline descendants
    // survive without inventing a block wrapper inside a paragraph.
    default: return <>{children()}</>
  }
}

function renderNode(node: RootContent | ElementContent, context: RenderContext): ReactNode {
  if (node.type === 'text') return node.value
  if (!isElement(node)) return null

  const component = stringProp(node, 'dataReportComponent')
  if (!isRegistered(component, context)) return renderSemantic(node, context)
  return (
    <ComponentBoundary fallback={renderSemantic(node, context)}>
      {COMPONENT_RENDERERS[component](node, context)}
    </ComponentBoundary>
  )
}

export interface ReportDocumentProps {
  /** A sanitized hast tree. The caller owns parsing and therefore the trust boundary. */
  tree: Root
  /** Component identities from the platform-owned report contract table. */
  componentNames: readonly string[]
  /** Optional owner-provided upgrade for parsed HTTP evidence. */
  renderHttpView?: (view: TrafficHttpView) => ReactNode
  className?: string
}

/** Render a report contract tree as an interactive document. */
export function ReportDocument({ tree, componentNames, renderHttpView, className }: ReportDocumentProps) {
  const rendered = useMemo(() => {
    const context = prepareContext(tree.children, componentNames, renderHttpView)
    return renderNodes(tree.children, context)
  }, [tree, componentNames, renderHttpView])

  return <div className={cn('cyber-report', className)}>{rendered}</div>
}
