import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle, ScrollArea } from '@cyber/ui'
import { CheckCircle2, Code2, Download, Target } from 'lucide-react'
import { JsonViewer } from './json-viewer'

interface MatcherDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'matcher' | 'extractor'
  name: string
  matchedValues: string[]
  yamlDefinition?: unknown
}

export function MatcherDetailDialog({
  open,
  onOpenChange,
  type,
  name,
  matchedValues,
  yamlDefinition,
}: MatcherDetailDialogProps) {
  const icon = type === 'matcher' ? <Target className="h-5 w-5" /> : <Download className="h-5 w-5" />
  const title = type === 'matcher' ? '匹配器' : '提取器'
  const colorClass = type === 'matcher' ? 'text-red-600' : 'text-blue-600'
  const bgClass = type === 'matcher'
    ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
    : 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
  const textClass = type === 'matcher'
    ? 'text-red-700 dark:text-red-400'
    : 'text-blue-700 dark:text-blue-400'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${colorClass}`}>
            {icon}
            {title}详情 - {name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 h-[calc(85vh-120px)]">
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">YAML 配置</span>
            </div>
            <ScrollArea className="flex-1 p-4">
              {yamlDefinition ? (
                <JsonViewer
                  data={yamlDefinition}
                  showTypes={true}
                  maxHeight="none"
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Code2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">未找到对应的 YAML 定义</p>
                  <p className="text-xs mt-1">可能是 POC 内容未加载或格式不匹配</p>
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${colorClass}`} />
                <span className="text-sm font-medium">匹配结果</span>
              </div>
              <Badge variant="outline" className="text-xs">
                共 {matchedValues.length} 项
              </Badge>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {matchedValues.map((value, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${bgClass}`}
                  >
                    <div className="flex items-start gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs shrink-0 mt-0.5"
                      >
                        {idx + 1}
                      </Badge>
                      <code className={`text-sm flex-1 break-all ${textClass}`}>
                        {value}
                      </code>
                    </div>
                  </div>
                ))}
                {matchedValues.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>暂无匹配结果</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
