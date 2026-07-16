import { AlertCircle, AlertOctagon, AlertTriangle, Info } from 'lucide-react'
import type { ReactNode } from 'react'

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface SeverityConfig {
  label: string
  icon: ReactNode
  className: string
  unselectedClassName: string
  hoverClassName: string
}

const severityConfigs: Record<SeverityLevel, SeverityConfig> = {
  critical: {
    label: '严重',
    icon: <AlertOctagon className="h-3 w-3" />,
    className: '!bg-red-100 text-red-800 border-red-200',
    unselectedClassName: '!bg-white text-red-600 border-red-200',
    hoverClassName: 'hover:!bg-red-100 hover:text-red-800 hover:border-red-300',
  },
  high: {
    label: '高危',
    icon: <AlertTriangle className="h-3 w-3" />,
    className: '!bg-orange-100 text-orange-800 border-orange-200',
    unselectedClassName: '!bg-white text-orange-600 border-orange-200',
    hoverClassName: 'hover:!bg-orange-100 hover:text-orange-800 hover:border-orange-300',
  },
  medium: {
    label: '中危',
    icon: <AlertCircle className="h-3 w-3" />,
    className: '!bg-yellow-100 text-yellow-800 border-yellow-200',
    unselectedClassName: '!bg-white text-yellow-600 border-yellow-200',
    hoverClassName: 'hover:!bg-yellow-100 hover:text-yellow-800 hover:border-yellow-300',
  },
  low: {
    label: '低危',
    icon: <Info className="h-3 w-3" />,
    className: '!bg-blue-100 text-blue-800 border-blue-200',
    unselectedClassName: '!bg-white text-blue-600 border-blue-200',
    hoverClassName: 'hover:!bg-blue-100 hover:text-blue-800 hover:border-blue-300',
  },
  info: {
    label: '信息',
    icon: <Info className="h-3 w-3" />,
    className: '!bg-gray-100 text-gray-800 border-gray-200',
    unselectedClassName: '!bg-white text-gray-600 border-gray-200',
    hoverClassName: 'hover:!bg-gray-100 hover:text-gray-800 hover:border-gray-300',
  },
}

export function getSeverityConfig(severity: string): SeverityConfig {
  return severityConfigs[severity as SeverityLevel] || severityConfigs.info
}

export function getSeverityClassName(severity: string, isSelected = false, withHover = false): string {
  const config = getSeverityConfig(severity)

  if (isSelected) return config.className
  if (withHover) return `${config.unselectedClassName} ${config.hoverClassName}`
  return config.className
}

export const severityOptions: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info']
