/**
 * The remembered theme choice: 'system' follows the OS, 'light' / 'dark' are explicit.
 * New installs start 'light'.
 *
 * **Synchronous `localStorage`, deliberately not `preferences.ts`** (same reasoning as
 * `lib/storage/panelLayout.ts`): Capacitor Preferences is async, so the saved theme would
 * only arrive after the first paint and a dark-mode user would see a flash of light on
 * every launch. `index.html` reads this same key in an inline script before first paint,
 * so keep `THEME_STORAGE_KEY` and the values in sync with that script. Every access is
 * guarded: storage can be unavailable and theming must never break over it.
 */

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'taskodoro.theme'
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light'

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'system' || raw === 'light' || raw === 'dark') return raw
  } catch {
    // Unavailable storage: fall through to the default.
  }
  return DEFAULT_THEME_PREFERENCE
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Unavailable or full storage: the choice just isn't remembered this time.
  }
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return preference
}

/** Browser chrome / Android status-bar colour per theme: matches `--color-surface`. */
export const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#f4f5f7',
  dark: '#28282b',
}
