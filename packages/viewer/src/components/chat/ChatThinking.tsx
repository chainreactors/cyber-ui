import { type ReactNode } from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@cyber/theme'

export interface ChatThinkingProps {
  actorName?: string | null
  children?: ReactNode
  className?: string
}

export default function ChatThinking({ actorName, children, className }: ChatThinkingProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-400/20 text-purple-600 dark:text-purple-300">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-[10px] font-medium text-muted-foreground">
          {actorName || 'Agent'}
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          {children || <ThinkingDots />}
        </div>
      </div>
    </div>
  )
}

export function ThinkingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms] [animation-duration:1s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms] [animation-duration:1s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms] [animation-duration:1s]" />
    </div>
  )
}
