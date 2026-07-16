import { Archive, CheckCircle, Clock, FileEdit, XCircle } from 'lucide-react'
import { Badge } from '@cyber/ui'
import { cn } from '@cyber/theme'

type POCStatus = 'active' | 'pending' | 'draft' | 'inactive' | 'deprecated' | 'deleted'

interface POCStatusBadgeProps {
  status?: POCStatus | null
  className?: string
}

export function POCStatusBadge({ status, className }: POCStatusBadgeProps) {
  const getStatusConfig = (value: POCStatus) => {
    switch (value) {
      case 'active':
        return {
          label: '已激活',
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:bg-green-100 hover:text-green-800 cursor-default',
        }
      case 'pending':
        return {
          label: '待审核',
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 hover:bg-yellow-100 hover:text-yellow-800 cursor-default',
        }
      case 'draft':
        return {
          label: '草稿',
          variant: 'outline' as const,
          icon: FileEdit,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-100 hover:text-blue-800 cursor-default',
        }
      case 'inactive':
        return {
          label: '未激活',
          variant: 'secondary' as const,
          icon: XCircle,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-800 cursor-default',
        }
      case 'deprecated':
        return {
          label: '已废弃',
          variant: 'destructive' as const,
          icon: Archive,
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 hover:bg-red-100 hover:text-red-800 cursor-default',
        }
      case 'deleted':
        return {
          label: '已删除',
          variant: 'secondary' as const,
          icon: XCircle,
          className: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-700 cursor-default',
        }
      default:
        return {
          label: '未知',
          variant: 'outline' as const,
          icon: XCircle,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-800 cursor-default',
        }
    }
  }

  const config = getStatusConfig(status ?? 'draft')
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, 'flex items-center gap-1 text-xs', className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}
