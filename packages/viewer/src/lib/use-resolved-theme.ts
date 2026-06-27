import { useTheme } from '../providers/ThemeProvider'

/**
 * Resolve theme from either an explicit prop, the ThemeProvider context,
 * or the host document's `dark` class (for embedded usage in CTEM etc.).
 * Priority: isDarkProp > ThemeProvider > DOM detection.
 */
export function useResolvedTheme(isDarkProp?: boolean): boolean {
  if (isDarkProp !== undefined) return isDarkProp
  const { theme } = useTheme()
  if (theme !== 'dark' && theme !== 'light') {
    // No ThemeProvider — detect from host document
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  }
  return theme === 'dark'
}
