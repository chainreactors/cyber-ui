import React, { useMemo } from 'react'
import type { AOPEvent } from '@cyber/agent-protocol'
import { reduceAOPToTimeline, type ReduceAOPOptions } from '../../lib/aop-reducer'
import { ChatPanel } from './ChatPanel'
import type { ChatPanelProps, ChatPanelTimelineProps } from './ChatPanel'

export interface AOPChatPanelProps extends Omit<ChatPanelProps, 'timeline' | 'children'> {
  events: readonly AOPEvent[]
  streaming?: boolean
  lifecycle?: ReduceAOPOptions['lifecycle']
  timelineProps?: ChatPanelTimelineProps
  children?: React.ReactNode
}

/** Thin AOP-native wrapper around the composable ChatPanel. */
export function AOPChatPanel({
  events,
  streaming = false,
  lifecycle,
  timelineProps,
  children,
  ...panelProps
}: AOPChatPanelProps) {
  const timeline = useMemo(
    () => reduceAOPToTimeline(events, { streaming, lifecycle }),
    [events, lifecycle, streaming],
  )

  return (
    <ChatPanel timeline={timeline} {...panelProps}>
      {children ?? <ChatPanel.Timeline {...timelineProps} />}
    </ChatPanel>
  )
}
