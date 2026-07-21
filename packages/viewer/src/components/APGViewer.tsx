// LEGACY APG tier: no in-repo consumers and no Go producer — AOP
// (lib/aop-reducer.ts) is the only live message implementation.
// Kept intact pending a consumer-side refactor to AOP.

import { useMemo, useState, type CSSProperties } from 'react'
import { useAPGEvents } from '../providers/APGWebSocketProvider'
import { useTheme } from '../providers/ThemeProvider'
import { GitBranch, MessageSquare, Activity, Wifi, WifiOff, List, Sun, Moon } from 'lucide-react'
import { reduceExecutionHistoryGraphState } from '../lib/execution-history-graph'
import StaticGraphView from './graph/StaticGraphView'
import { ConnectedTimeline } from './graph/ExecutionTimeline'
import { ConnectedChatPanel } from './chat/LiveChatPanel'
import ExecutionGraphView from './ExecutionGraphView'

type LeftTab = 'definition' | 'execution'
type RightTab = 'chat' | 'log'

const iconSm: CSSProperties = { width: 12, height: 12 }
const iconMd: CSSProperties = { width: 16, height: 16 }

export default function APGViewer() {
  const { connected, events } = useAPGEvents()
  const { theme, toggle } = useTheme()
  const [leftTab, setLeftTab] = useState<LeftTab>('definition')
  const [rightTab, setRightTab] = useState<RightTab>('chat')

  const isDark = theme === 'dark'
  const executionGraph = useMemo(
    () => reduceExecutionHistoryGraphState(events, []),
    [events],
  )
  const graphName = executionGraph.graphName
  const isRunning = executionGraph.isRunning

  const rootStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column',
    height: '100vh', width: '100vw',
    background: isDark ? '#030712' : '#f9fafb',
    color: isDark ? '#f3f4f6' : '#111827',
  }

  const headerStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 16px',
    borderBottom: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
    backdropFilter: 'blur(4px)',
    background: isDark ? 'rgba(17,24,39,0.8)' : 'rgba(255,255,255,0.8)',
  }

  return (
    <div style={rootStyle}>
      {/* Top bar */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {graphName || 'APG Viewer'}
          </span>
          {isRunning && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, padding: '2px 8px', borderRadius: 9999,
              background: 'rgba(30,58,138,0.5)', color: '#93c5fd',
              border: '1px solid rgba(30,64,175,0.4)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }} />
              Running
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={toggle}
            style={{
              padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: isDark ? '#9ca3af' : '#6b7280',
              transition: 'color 0.15s',
            }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun style={iconMd} /> : <Moon style={iconMd} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {connected
              ? <Wifi style={{ width: 14, height: 14, color: '#4ade80' }} />
              : <WifiOff style={{ width: 14, height: 14, color: '#f87171' }} />
            }
            <span style={{ fontSize: 10, color: isDark ? '#6b7280' : '#9ca3af' }}>
              {connected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRight: leftTab === 'definition'
            ? `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`
            : 'none',
          minWidth: 0,
        }}>
          <TabBar
            tabs={[
              { key: 'definition', label: 'Graph Definition', icon: <GitBranch style={iconSm} /> },
              { key: 'execution', label: 'Live Execution', icon: <Activity style={iconSm} /> },
            ]}
            active={leftTab}
            onSelect={(k) => setLeftTab(k as LeftTab)}
            isDark={isDark}
          />
          <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
            {leftTab === 'definition' ? (
              <StaticGraphView />
            ) : (
              <ExecutionGraphView
                events={[]}
                historyEvents={events}
                isRunning={isRunning}
              />
            )}
          </div>
        </div>

        {leftTab === 'definition' && (
          <div style={{ width: 440, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <TabBar
              tabs={[
                { key: 'chat', label: 'Agent Chat', icon: <MessageSquare style={iconSm} /> },
                { key: 'log', label: 'Execution Log', icon: <List style={iconSm} /> },
              ]}
              active={rightTab}
              onSelect={(k) => setRightTab(k as RightTab)}
              isDark={isDark}
            />
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {rightTab === 'chat' ? <ConnectedChatPanel /> : <ConnectedTimeline />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* Reusable tab bar */
function TabBar({ tabs, active, onSelect, isDark }: {
  tabs: { key: string; label: string; icon: React.ReactNode }[]
  active: string
  onSelect: (key: string) => void
  isDark: boolean
}) {
  const barStyle: CSSProperties = {
    display: 'flex',
    borderBottom: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
    background: isDark ? 'rgba(17,24,39,0.4)' : 'rgba(243,244,246,0.6)',
  }

  const btnStyle = (isActive: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', fontSize: 12, fontWeight: 500,
    border: 'none', cursor: 'pointer', background: 'transparent',
    transition: 'color 0.15s',
    color: isActive
      ? (isDark ? '#f3f4f6' : '#111827')
      : (isDark ? '#6b7280' : '#9ca3af'),
    borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
    ...(isActive && !isDark ? { background: 'rgba(255,255,255,0.6)' } : {}),
    ...(isActive && isDark ? { background: 'rgba(31,41,55,0.3)' } : {}),
  })

  return (
    <div style={barStyle}>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onSelect(t.key)} style={btnStyle(active === t.key)}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}
