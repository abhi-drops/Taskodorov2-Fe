import { createContext, useContext } from 'react'
import type { ResolvedTheme, ThemePreference } from './themeStorage'

export interface ThemeContextValue {
  /** What the user picked: 'system', 'light' or 'dark'. */
  preference: ThemePreference
  /** What is actually showing: always 'light' or 'dark'. */
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
