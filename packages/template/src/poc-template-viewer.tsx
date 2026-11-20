import { useMemo } from 'react'
import { Activity, AlertTriangle, Bug, Clock, Copy, Database, FileText, Fingerprint as FingerprintIcon, Info, Link2, Shield, User } from 'lucide-react'
import yaml from 'js-yaml'
import { Badge, Button, Card } from '@cyber/ui'
import { cn } from '@cyber/theme'
import type { CyberHubPocTemplate, CyberHubPocTemplateViewerProps, POCStatusValue } from './types'
import { copyToClipboard } from './clipboard'
import { CVSSScoreCircle } from './cvss-score-circle'
import { formatFullTime, formatRelativeTime } from './date-format'
import { POCStatusBadge } from './poc-status-badge'
import { ResultCard } from './result-card'
import { SeverityBadge } from './severity-badge'
import { YamlEditor } from './yaml-editor'

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]'
}

const asRecord = (value: unknown): Record<string, unknown> => {
  return isPlainObject(value) ? value : {}
}

const normalizeLinks = (value: unknown): string[] => {
  if (value === null || value === undefined) return []

  const list = Array.isArray(value) ? value : [value]
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const item of list) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    normalized.push(trimmed)
  }

  return normalized
}

const extractLinksFromRawContent = (content: string): string[] => {
  if (!content || !content.trim()) return []

  try {
    const parsed = yaml.load(content)
    if (!isPlainObject(parsed)) return []

    if (isPlainObject(parsed.info) && isPlainObject(parsed.info.metadata)) {
      const metadataLinks = normalizeLinks(parsed.info.metadata.link)
      if (metadataLinks.length > 0) return metadataLinks
    }

    return normalizeLinks(parsed.link)
  } catch {
    return []
  }
}

const normalizeDisplayText = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value || undefined
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

const normalizeFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const isStatusValue = (value: unknown): value is POCStatusValue => {
  return typeof value === 'string' && ['active', 'pending', 'draft', 'inactive', 'deprecated', 'deleted'].includes(value)
}

export function CyberHubPocTemplateViewer({
  poc,
  result,
  className,
  showResultCard = true,
  testPanel,
  associationPanel,
  metadataPanel,
  bottomActions,
  compareAction,
}: CyberHubPocTemplateViewerProps) {
  const pocInfo = asRecord(poc.info)
  const classification = asRecord(pocInfo.classification)
  const metadata = asRecord(pocInfo.metadata)
  const cveId = normalizeDisplayText(classification['cve-id']) || poc.cve
  const cweId = normalizeDisplayText(classification['cwe-id']) || normalizeDisplayText(classification.cwe_id)
  const cvssScore = normalizeFiniteNumber(classification['cvss-score']) || normalizeFiniteNumber(classification.cvss_score) || 0
  const cvssMetrics = normalizeDisplayText(classification['cvss-metrics']) || normalizeDisplayText(classification.cvss_metrics)
  const epssScore = normalizeFiniteNumber(classification['epss-score']) || normalizeFiniteNumber(classification.epss_score)
  const epssPercentile = normalizeFiniteNumber(classification['epss-percentile']) || normalizeFiniteNumber(classification.epss_percentile)
  const verified = Boolean(pocInfo.verified)
  const impact = normalizeDisplayText(pocInfo.impact)
  const remediation = normalizeDisplayText(pocInfo.remediation)
  const displayRawContent = poc.raw_content || poc.raw_content_draft || ''
  const yamlLinks = useMemo(() => extractLinksFromRawContent(displayRawContent), [displayRawContent])
  const references = normalizeLinks(pocInfo.reference)
  const links = references.length > 0 ? references : yamlLinks.length > 0 ? yamlLinks : normalizeLinks(poc.link)

  const handleCopyText = async (text: string) => {
    await copyToClipboard(text)
  }
  const sectionClass = 'rounded-lg border-0 bg-surface-2 shadow-none ring-1 ring-line'

  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      <div className="flex-none rounded-t-xl border-b border-line bg-surface px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <SeverityBadge severity={poc.severity || 'info'} size="sm" className="!border-transparent shadow-none" />
              {poc.poc_id && (
                <Badge variant="muted" className="border-transparent bg-surface-2 font-mono text-xs text-muted shadow-none">
                  {poc.poc_id}
                </Badge>
              )}
              <h2 className="text-lg font-bold text-fg line-clamp-1">{poc.name}</h2>
              <POCStatusBadge status={isStatusValue(poc.status) ? poc.status : 'draft'} />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted flex-wrap mb-1.5">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 text-faint" />
                <span>{poc.author || '未知'}</span>
              </div>
              {cveId && (
                <div className="flex items-center gap-1">
                  <Bug className="h-3 w-3 text-red-400" />
                  <span className="font-mono">{cveId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyText(cveId)}
                    className="h-4 w-4 p-0"
                  >
                    <Copy className="h-2.5 w-2.5" />
                  </Button>
                </div>
              )}
              {cvssScore > 0 && (
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-orange-400" />
                  <span>CVSS {cvssScore.toFixed(1)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3 text-faint" />
                <span>{poc.source || '未知'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-faint" />
                <span>{formatRelativeTime(poc.updated_at)}</span>
              </div>
            </div>

            {poc.tags && poc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {poc.tags.map((tag) => (
                  <Badge key={tag} variant="default" className="text-xs h-4 px-1.5">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-surface px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            {testPanel}

            <Card className={sectionClass}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-fg">基础信息</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">数据库ID</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-fg font-mono">{poc.id || '-'}</span>
                      {poc.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyText(String(poc.id))}
                          className="h-5 w-5 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">POC ID</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-fg font-mono">{poc.poc_id || '-'}</span>
                      {poc.poc_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyText(poc.poc_id!)}
                          className="h-5 w-5 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">POC类型</span>
                    <span className="font-medium text-fg">
                      {poc.type?.toUpperCase() || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">格式</span>
                    <span className="font-medium text-fg">
                      {poc.format?.toUpperCase() || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">版本</span>
                    <span className="font-medium text-fg">
                      {poc.version || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">验证状态</span>
                    <span className="font-medium text-fg">
                      {verified ? '已验证' : '未验证'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">创建时间</span>
                    <span className="font-medium text-fg">
                      {formatFullTime(poc.created_at)}
                    </span>
                  </div>
                </div>

                {(impact || remediation) && (
                  <div className="mt-4 space-y-3 border-t border-line pt-4">
                    {impact && (
                      <div>
                        <div className="text-xs font-medium text-muted mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                          影响范围
                        </div>
                        <div className="rounded-md bg-warn-soft p-3 text-xs leading-relaxed text-fg ring-1 ring-line">
                          {impact}
                        </div>
                      </div>
                    )}
                    {remediation && (
                      <div>
                        <div className="text-xs font-medium text-muted mb-1 flex items-center gap-1">
                          <Shield className="h-3 w-3 text-green-500" />
                          修复建议
                        </div>
                        <div className="rounded-md bg-ok-soft p-3 text-xs leading-relaxed text-fg ring-1 ring-line">
                          {remediation}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {displayRawContent.trim().length > 0 && (
              <Card className={sectionClass}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <h3 className="text-sm font-semibold text-fg">规则配置</h3>
                    </div>
                    {compareAction}
                  </div>
                  <div className="overflow-hidden rounded-lg ring-1 ring-line">
                    <YamlEditor
                      value={displayRawContent}
                      onChange={() => {}}
                      height="400px"
                      readOnly={true}
                    />
                  </div>
                </div>
              </Card>
            )}

            {showResultCard && result && (
              <ResultCard result={result} index={0} />
            )}
          </div>

          <div className="space-y-4">
            {associationPanel}

            {cvssScore > 0 && (
              <Card className={sectionClass}>
                <div className="p-4 flex justify-center">
                  <CVSSScoreCircle score={cvssScore} size={100} strokeWidth={8} />
                </div>
              </Card>
            )}

            <Card className={sectionClass}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-fg">安全分类</h3>
                </div>
                <div className="space-y-2.5">
                  {cveId && (
                    <div>
                      <div className="text-xs text-muted mb-1">CVE编号</div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {cveId}
                      </Badge>
                    </div>
                  )}
                  {cweId && (
                    <div>
                      <div className="text-xs text-muted mb-1">CWE编号</div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {cweId}
                      </Badge>
                    </div>
                  )}
                  {cvssMetrics && (
                    <div>
                      <div className="text-xs text-muted mb-1">CVSS向量</div>
                      <div className="text-[10px] text-faint font-mono break-all">
                        {cvssMetrics}
                      </div>
                    </div>
                  )}
                  {(epssScore || epssPercentile) && (
                    <div>
                      <div className="text-xs text-muted mb-1">EPSS评分</div>
                      <div className="space-y-1">
                        {epssScore && (
                          <div className="text-xs">
                            <span className="text-muted">Score:</span>{' '}
                            <span className="font-medium">{(epssScore * 100).toFixed(2)}%</span>
                          </div>
                        )}
                        {epssPercentile && (
                          <div className="text-xs">
                            <span className="text-muted">Percentile:</span>{' '}
                            <span className="font-medium">{(epssPercentile * 100).toFixed(2)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {!cveId && !cweId && !cvssScore && !epssScore && (
                    <div className="text-xs text-faint text-center py-3">
                      暂无安全分类信息
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {poc.categories && poc.categories.length > 0 && (
              <Card className={sectionClass}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FingerprintIcon className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-fg">分类</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {poc.categories.map((category) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {metadataPanel}

            {links.length > 0 && (
              <Card className={sectionClass}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-fg">参考链接</h3>
                  </div>
                  <div className="space-y-1.5">
                    {links.map((ref) => (
                      <a
                        key={ref}
                        href={ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:text-accent-hover hover:underline block truncate"
                      >
                        {ref}
                      </a>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {bottomActions && (
        <div className="flex-none border-t border-line bg-surface px-6 py-3">
          {bottomActions}
        </div>
      )}
    </div>
  )
}
