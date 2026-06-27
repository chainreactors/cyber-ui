import type { ComponentType } from 'react'
import type { ForumParticipant, IoaMessageRecord } from '../types'
import { AlertCircle, ArrowRightLeft, Check, MessageSquare, Network } from 'lucide-react'

export interface ContentRendererProps {
  message: IoaMessageRecord
  participants: Map<string, ForumParticipant>
  extra: Record<string, unknown>
}

export type TimelineTone = 'primary' | 'warning' | 'success' | 'info' | 'accent' | 'neutral'

export interface ContentRendererConfig {
  renderer?: ComponentType<ContentRendererProps>
  tone: TimelineTone
  icon: ComponentType<{ className?: string }>
  badgeVariant: 'warning' | 'success' | 'outline' | 'secondary' | 'destructive'
  dotColor: string
}

const registry = new Map<string, ContentRendererConfig>()

const defaultConfig: ContentRendererConfig = {
  tone: 'neutral',
  icon: MessageSquare,
  badgeVariant: 'outline',
  dotColor: 'bg-muted-foreground/40',
}

export function registerContentRenderer(type: string, config: Partial<ContentRendererConfig> & { renderer?: ComponentType<ContentRendererProps> }) {
  registry.set(type, { ...defaultConfig, ...config })
}

export function resolveRenderer(type: string): ContentRendererConfig {
  return registry.get(type) ?? defaultConfig
}

registerContentRenderer('checkpoint', {
  tone: 'warning',
  icon: AlertCircle,
  badgeVariant: 'warning',
  dotColor: 'bg-warning',
})

registerContentRenderer('feedback', {
  tone: 'success',
  icon: Check,
  badgeVariant: 'success',
  dotColor: 'bg-success',
})

registerContentRenderer('handoff', {
  tone: 'accent',
  icon: ArrowRightLeft,
  badgeVariant: 'secondary',
  dotColor: 'bg-indigo-500',
})

registerContentRenderer('swarm', {
  tone: 'accent',
  icon: Network,
  badgeVariant: 'secondary',
  dotColor: 'bg-blue-500',
})
