import { useLocation, useNavigate } from 'react-router'
import { usePlatform } from '../../lib/platform/usePlatform'
import { AnimatedIcon } from './AnimatedIcon'
import { ChevronLeftIcon } from './icons'

/**
 * Desktop-only circular back button — same round, bordered-circle weight as the note
 * card's status circle (`CheckCircle`) — pinned to the actual top-left corner of the
 * viewport (`fixed`, above `AppShell`'s `z-30` header), not placed inline in page flow.
 * Self-gates on `isMobile` so it's safe to drop into a component shared with mobile.
 * Dropped into whichever pages want it; not global chrome in `AppShell` itself.
 */
export function BackLink() {
  const { isMobile } = usePlatform()
  const location = useLocation()
  const navigate = useNavigate()

  if (isMobile) return null

  // `location.key === 'default'` means this is the first entry in the router's history
  // (a direct URL load / refresh) — `navigate(-1)` there would exit the SPA entirely.
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={goBack}
      className="fixed left-6 top-6 z-40 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-white text-ink shadow-card hover:opacity-90"
    >
      <AnimatedIcon icon={ChevronLeftIcon} size={18} />
    </button>
  )
}
