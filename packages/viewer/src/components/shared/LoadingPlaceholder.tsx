import { useEffect, useState, type CSSProperties } from 'react'
import { useResolvedTheme } from '../../lib/use-resolved-theme'

export interface LoadingPlaceholderProps {
  label?: string
  isDark?: boolean
  compact?: boolean
}

export default function LoadingPlaceholder({
  label = 'Loading',
  isDark: isDarkProp,
  compact = false,
}: LoadingPlaceholderProps) {
  const isDark = useResolvedTheme(isDarkProp)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const handle = window.setInterval(() => {
      setFrame((current) => (current + 1) % 3)
    }, 320)
    return () => window.clearInterval(handle)
  }, [])

  const tone = {
    text: isDark ? '#cbd5e1' : '#475569',
    muted: isDark ? '#64748b' : '#94a3b8',
    active: isDark ? '#60a5fa' : '#2563eb',
    background: isDark ? 'rgba(30,41,59,0.72)' : '#ffffff',
    border: isDark ? 'rgba(51,65,85,0.72)' : '#e2e8f0',
  }

  const dotStyle = (index: number): CSSProperties => ({
    width: compact ? 5 : 6,
    height: compact ? 5 : 6,
    borderRadius: 999,
    background: frame === index ? tone.active : tone.muted,
    opacity: frame === index ? 1 : 0.4,
    transform: frame === index ? 'translateY(-1px)' : 'translateY(1px)',
    transition: 'opacity 180ms ease, transform 180ms ease, background 180ms ease',
  })

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 8 : 10,
        padding: compact ? '6px 8px' : '10px 12px',
        borderRadius: compact ? 10 : 12,
        border: `1px solid ${tone.border}`,
        background: tone.background,
        color: tone.text,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {[0, 1, 2].map((index) => (
          <span key={index} style={dotStyle(index)} />
        ))}
      </div>
      <span
        style={{
          fontSize: compact ? 11 : 12,
          lineHeight: 1.45,
          whiteSpace: compact ? 'nowrap' : 'normal',
        }}
      >
        {label}
      </span>
    </div>
  )
}
