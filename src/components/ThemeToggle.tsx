import { AnimatedIcon } from './ui/AnimatedIcon'
import { MoonIcon, SunIcon } from './ui/icons'
import { useTheme } from '../lib/theme/themeContext'

/**
 * Quick light/dark flip for the desktop Home header (beside the search icon), styled like
 * `SyncStatusBadge`: a small dark circle with a yellow icon. Picks an
 * explicit theme from what is showing now, so from 'system' it still lands on the
 * opposite of what the user sees. The full System/Light/Dark picker is in Settings.
 */
export function ThemeToggle() {
  const { resolved, setPreference } = useTheme()
  const toDark = resolved === 'light'

  return (
    <button
      type="button"
      onClick={() => setPreference(toDark ? 'dark' : 'light')}
      aria-label={toDark ? 'Switch to dark theme' : 'Switch to light theme'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sticky-yellow transition-transform duration-200 hover:scale-110 active:scale-95 motion-reduce:transition-none"
    >
      <AnimatedIcon icon={toDark ? MoonIcon : SunIcon} size={16} />
    </button>
  )
}
