import React, { useState } from 'react'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@cyber/ui'
import { ChevronDown, ChevronRight, Copy, Eye, EyeOff } from 'lucide-react'
import { copyToClipboard } from './clipboard'

interface JsonViewerProps {
  data: unknown
  title?: string
  collapsed?: boolean
  showTypes?: boolean
  maxHeight?: string
  onCopyResult?: (success: boolean, description: string) => void
}

interface JsonNodeProps {
  data: unknown
  path: string
  level: number
  showTypes: boolean
  onCopy: (value: string, path: string) => void
}

type JsonValueType =
  | 'array'
  | 'bigint'
  | 'boolean'
  | 'function'
  | 'null'
  | 'number'
  | 'object'
  | 'string'
  | 'symbol'
  | 'undefined'

const isRecordLike = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const getValueType = (value: unknown): JsonValueType => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

const getTypeColor = (type: JsonValueType): string => {
  switch (type) {
    case 'string': return 'bg-green-100 text-green-800'
    case 'number': return 'bg-blue-100 text-blue-800'
    case 'boolean': return 'bg-purple-100 text-purple-800'
    case 'array': return 'bg-orange-100 text-orange-800'
    case 'object': return 'bg-gray-100 text-gray-800'
    case 'null': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, path, level, showTypes, onCopy }) => {
  const [isOpen, setIsOpen] = useState(level < 3)
  const type = getValueType(data)
  const arrayItems: unknown[] = Array.isArray(data) ? data : []
  const objectEntries: [string, unknown][] = isRecordLike(data) ? Object.entries(data) : []
  const isExpandable = arrayItems.length > 0 || objectEntries.length > 0 || type === 'object' || type === 'array'

  const renderValue = () => {
    if (data === null) return <span className="text-gray-400 italic">null</span>
    if (data === undefined) return <span className="text-gray-400 italic">undefined</span>
    if (typeof data === 'boolean') return <span className={data ? 'text-green-600' : 'text-red-600'}>{String(data)}</span>
    if (typeof data === 'string') {
      const isUrl = /^https?:\/\//.test(data)
      if (isUrl) {
        return (
          <a href={data} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {data}
          </a>
        )
      }
      return <span className="text-green-600">{`"${data}"`}</span>
    }
    if (typeof data === 'number') return <span className="text-blue-600">{data}</span>
    return null
  }

  const getCollectionInfo = () => {
    if (type === 'array') return `[${arrayItems.length}]`
    if (type === 'object') return `{${objectEntries.length}}`
    return ''
  }

  if (!isExpandable) {
    return (
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${level * 20}px` }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {renderValue()}
          {showTypes && (
            <Badge variant="outline" className={`text-xs px-1 py-0 ${getTypeColor(type)}`}>
              {type}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
          onClick={() => onCopy(String(data), path)}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="group" style={{ paddingLeft: `${level * 20}px` }}>
      <CollapsiblePrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 py-1">
          <CollapsiblePrimitive.Trigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </CollapsiblePrimitive.Trigger>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-gray-600 text-sm">{getCollectionInfo()}</span>
            {showTypes && (
              <Badge variant="outline" className={`text-xs px-1 py-0 ${getTypeColor(type)}`}>
                {type}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={() => onCopy(JSON.stringify(data, null, 2), path)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <CollapsiblePrimitive.Content>
          <div className="border-l border-gray-200 ml-3">
            {type === 'array' ? (
              arrayItems.map((item, index) => (
                <div key={index} className="relative">
                  <div className="absolute -left-3 top-2 w-2 h-px bg-gray-200" />
                  <div className="text-xs text-gray-500 mb-1" style={{ paddingLeft: `${(level + 1) * 20}px` }}>
                    [{index}]
                  </div>
                  <JsonNode
                    data={item}
                    path={`${path}[${index}]`}
                    level={level + 1}
                    showTypes={showTypes}
                    onCopy={onCopy}
                  />
                </div>
              ))
            ) : (
              objectEntries.map(([key, value]) => (
                <div key={key} className="relative">
                  <div className="absolute -left-3 top-2 w-2 h-px bg-gray-200" />
                  <div className="text-xs font-medium text-gray-700 mb-1" style={{ paddingLeft: `${(level + 1) * 20}px` }}>
                    {key}:
                  </div>
                  <JsonNode
                    data={value}
                    path={`${path}.${key}`}
                    level={level + 1}
                    showTypes={showTypes}
                    onCopy={onCopy}
                  />
                </div>
              ))
            )}
          </div>
        </CollapsiblePrimitive.Content>
      </CollapsiblePrimitive.Root>
    </div>
  )
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title,
  collapsed = false,
  showTypes = true,
  maxHeight = '400px',
  onCopyResult,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const [showTypesBadges, setShowTypesBadges] = useState(showTypes)

  const handleCopy = async (value: string, path: string) => {
    const success = await copyToClipboard(value)
    onCopyResult?.(success, success ? `路径 ${path} 的值已复制到剪贴板` : '无法复制到剪贴板')
  }

  const handleCopyAll = async () => {
    const success = await copyToClipboard(JSON.stringify(data, null, 2))
    onCopyResult?.(success, success ? '完整数据已复制到剪贴板' : '无法复制到剪贴板')
  }

  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return (
      <Card>
        {title && (
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-4 text-gray-500 text-sm">
            暂无数据
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{title}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTypesBadges(!showTypesBadges)}
                className="h-7 px-2"
              >
                {showTypesBadges ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span className="ml-1 text-xs">类型</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-7 px-2"
              >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAll}
                className="h-7 px-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <CollapsiblePrimitive.Root open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
          <CollapsiblePrimitive.Content>
            <div
              className="overflow-y-auto border rounded-lg bg-gray-50 p-3 text-sm font-mono"
              style={{ maxHeight }}
            >
              <JsonNode
                data={data}
                path="$"
                level={0}
                showTypes={showTypesBadges}
                onCopy={handleCopy}
              />
            </div>
          </CollapsiblePrimitive.Content>
        </CollapsiblePrimitive.Root>
      </CardContent>
    </Card>
  )
}
