import * as React from 'react'
import { cn } from '@cyber/theme'

export interface AgentVoiceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  streaming?: boolean
}

/**
 * Card shell with a Cortex-blue left edge — marks a card as "the agent's voice".
 * Used as an alternative to the avatar-circle bubble when `variant="voice-card"`.
 */
export const AgentVoiceCard = React.forwardRef<HTMLDivElement, AgentVoiceCardProps>(
  ({ streaming, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border border-l-2 border-l-ai/40 bg-card text-foreground shadow-soft',
        streaming && 'border-primary/40',
        className,
      )}
      {...props}
    />
  ),
)
AgentVoiceCard.displayName = 'AgentVoiceCard'
