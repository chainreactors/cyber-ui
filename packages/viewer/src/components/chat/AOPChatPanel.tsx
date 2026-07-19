import React, { useMemo } from 'react'
import type { AOPEvent } from '@cyber/agent-protocol'
import { reduceAOPToTimeline } from '../../lib/aop-reducer'
import { ChatPanel } from './ChatPanel'
import type { ChatPanelProps, ChatPanelTimelineProps } from './ChatPanel'

export interface AOPChatPanelProps extends Omit<ChatPanelProps, 'timeline' | 'children'> {
  events: readonly AOPEvent[]
  streaming?: boolean
  timelineProps?: ChatPanelTimelineProps
  children?: React.ReactNode
}

/** Thin AOP-native wrapper around the composable ChatPanel. */
export function AOPChatPanel({
  events,
  streaming = false,
  timelineProps,
  children,
  ...panelProps
}: AOPChatPanelProps) {
  const timeline = useMemo(
    () => reduceAOPToTimeline(events, { streaming }),
    [events, streaming],
  )

  return (
    <ChatPanel timeline={timeline} {...panelProps}>
      {children ?? <ChatPanel.Timeline {...timelineProps} />}
    </ChatPanel>
  )
}
