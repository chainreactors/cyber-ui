import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { ThemeContext, getTokens, type Theme } from './tokens'

const STORAGE_KEY = 'aspect-theme'

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* noop */ }
  return 'dark'
}

interface ThemeProviderProps {
  initial?: Theme
  storageKey?: string
  className?: string
  children: ReactNode
}

export function ThemeProvider({ initial, storageKey, className, children }: ThemeProviderProps) {
  const key = storageKey ?? STORAGE_KEY

  const [theme, setThemeState] = useState<Theme>(() => {
    if (initial) return initial
    try {
      const v = localStorage.getItem(key)
      if (v === 'light' || v === 'dark') return v
    } catch { /* noop */ }
    return 'dark'
  })

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try { localStorage.setItem(key, t) } catch { /* noop */ }
  }, [key])

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
  }, [theme])

  const tokens = getTokens(theme)

  return (
    <ThemeContext.Provider value={{ theme, tokens, isDark: theme === 'dark', setTheme, toggle }}>
      <div className={className ?? 'aspect-theme-root h-full bg-background text-foreground font-sans antialiased'}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
