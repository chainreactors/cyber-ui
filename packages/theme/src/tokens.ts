import { createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'

export interface ThemeTokens {
  bgRoot: string
  bgSurface: string
  bgCard: string
  bgCardHover: string
  bgCardSelected: string
  bgInput: string
  bgOverlay: string
  bgElevated: string

  border: string
  borderActive: string
  borderSubtle: string

  text: string
  textMuted: string
  textDim: string

  accent: string
  accentHover: string
  accentSubtle: string

  green: string
  yellow: string
  red: string
  orange: string
  purple: string

  shadowPop: string
  shadowCard: string
  shadowElevated: string
  shadowGlow: string
  solidAccent: string
  fontSans: string
  fontMono: string
}

const FONT_SANS = "'Inter', 'Noto Sans SC', 'PingFang SC', system-ui, -apple-system, sans-serif"
const FONT_MONO = "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace"

const darkTokens: ThemeTokens = {
  bgRoot: '#0c0f14',
  bgSurface: '#111520',
  bgCard: '#161b28',
  bgCardHover: '#1c2236',
  bgCardSelected: '#192030',
  bgInput: '#0e1118',
  bgOverlay: 'rgba(6,8,14,0.65)',
  bgElevated: '#131824',

  border: 'rgba(255,255,255,0.08)',
  borderActive: '#5b8def',
  borderSubtle: 'rgba(255,255,255,0.04)',

  text: '#e8ecf2',
  textMuted: '#8a95a8',
  textDim: '#5c6778',

  accent: '#5b8def',
  accentHover: '#7da3f5',
  accentSubtle: 'rgba(91,141,239,0.12)',

  green: '#5cc9a7',
  yellow: '#e8c547',
  red: '#e85d75',
  orange: '#e89b3e',
  purple: '#9b7bf5',

  shadowPop: 'rgba(0,0,0,0.40)',
  shadowCard: '0 1px 3px rgba(0,0,0,0.20)',
  shadowElevated: '0 12px 40px rgba(0,0,0,0.32), 0 0 0 1px rgba(91,141,239,0.06)',
  shadowGlow: '0 0 20px rgba(91,141,239,0.15)',
  solidAccent: '#5b8def',
  fontSans: FONT_SANS,
  fontMono: FONT_MONO,
}

const lightTokens: ThemeTokens = {
  bgRoot: '#f6f8fa',
  bgSurface: '#ffffff',
  bgCard: '#f0f2f5',
  bgCardHover: '#e8ebef',
  bgCardSelected: '#eaf0ff',
  bgInput: '#fafbfc',
  bgOverlay: 'rgba(12,15,20,0.35)',
  bgElevated: '#ffffff',

  border: 'rgba(12,15,20,0.10)',
  borderActive: '#3b6fce',
  borderSubtle: 'rgba(12,15,20,0.05)',

  text: '#111827',
  textMuted: '#4b5563',
  textDim: '#9ca3af',

  accent: '#3b6fce',
  accentHover: '#2d5ab5',
  accentSubtle: 'rgba(59,111,206,0.08)',

  green: '#0f8a6e',
  yellow: '#947614',
  red: '#c53554',
  orange: '#a66c12',
  purple: '#7c5cbf',

  shadowPop: 'rgba(12,15,20,0.10)',
  shadowCard: '0 1px 3px rgba(12,15,20,0.04)',
  shadowElevated: '0 12px 36px rgba(12,15,20,0.10), 0 0 0 1px rgba(59,111,206,0.06)',
  shadowGlow: '0 0 20px rgba(59,111,206,0.12)',
  solidAccent: '#111827',

  fontSans: FONT_SANS,
  fontMono: FONT_MONO,
}

export function getTokens(theme: Theme): ThemeTokens {
  return theme === 'dark' ? darkTokens : lightTokens
}

export function tokensToCSS(tokens: ThemeTokens): Record<string, string> {
  return {
    '--bg-root': tokens.bgRoot,
    '--bg-surface': tokens.bgSurface,
    '--bg-card': tokens.bgCard,
    '--bg-card-hover': tokens.bgCardHover,
    '--bg-card-selected': tokens.bgCardSelected,
    '--bg-input': tokens.bgInput,
    '--bg-overlay': tokens.bgOverlay,
    '--bg-elevated': tokens.bgElevated,
    '--border': tokens.border,
    '--border-active': tokens.borderActive,
    '--border-subtle': tokens.borderSubtle,
    '--text': tokens.text,
    '--text-muted': tokens.textMuted,
    '--text-dim': tokens.textDim,
    '--accent': tokens.accent,
    '--accent-hover': tokens.accentHover,
    '--accent-subtle': tokens.accentSubtle,
    '--green': tokens.green,
    '--yellow': tokens.yellow,
    '--red': tokens.red,
    '--orange': tokens.orange,
    '--purple': tokens.purple,
    '--shadow-pop': tokens.shadowPop,
    '--shadow-card': tokens.shadowCard,
    '--shadow-elevated': tokens.shadowElevated,
    '--shadow-glow': tokens.shadowGlow,
    '--solid-accent': tokens.solidAccent,
    '--font-sans': tokens.fontSans,
    '--font-mono': tokens.fontMono,
  }
}

export interface ThemeContextValue {
  theme: Theme
  tokens: ThemeTokens
  isDark: boolean
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  tokens: darkTokens,
  isDark: true,
  setTheme: () => {},
  toggle: () => {},
})

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
