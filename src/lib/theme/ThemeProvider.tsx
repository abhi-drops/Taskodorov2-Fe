import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  THEME_COLOR,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  type ThemePreference,
} from './themeStorage'
import { ThemeContext } from './themeContext'

/**
 * Owns the theme: applies it to `<html data-theme>` (on <html>, not a wrapper, so Radix
 * portals are themed too) and keeps the browser `theme-color` meta in step. The first
 * paint is already right because `index.html` sets `data-theme` from the same storage
 * key before React loads; this takes over from there. No dependency on auth, sync or the
 * database, so it sits outermost.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(loadThemePreference)
  // Bumped when the OS scheme flips, so 'system' re-resolves.
  const [systemTick, setSystemTick] = useState(0)

  useEffect(() => {
    if (preference !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTick((n) => n + 1)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  // `systemTick` only exists to re-run this when the OS scheme changes under 'system'.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resolved = useMemo(() => resolveTheme(preference), [preference, systemTick])

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolved])
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    saveThemePreference(next)
    setPreferenceState(next)
  }, [])

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
