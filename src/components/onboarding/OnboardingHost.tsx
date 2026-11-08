import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { router } from '../../router/routes'
import { useAppUpdate } from '../../lib/appUpdate/useAppUpdate'
import { useAuth } from '../../lib/auth/useAuth'
import { useSync } from '../../lib/sync/useSync'
import { useWorkspace } from '../../lib/workspace/useWorkspace'
import { useWhatsNew } from '../../lib/whatsNew/useWhatsNew'
import { useMobileWebNoticeOpen } from '../../lib/platform/mobileWebNoticeState'
import { onLocalChange } from '../../lib/db/localChange'
import { getOnboardingStats } from '../../lib/db/onboardingStats'
import { BOARD_TOUR_SEEN_KEY, INTRO_SEEN_KEY } from '../../lib/db/userStateSchema'
import { loadFlags, markFlag, useFlags } from '../../lib/onboarding/flags'
import { endPhase, startIntro, startTour, useOnboardingPhase } from '../../lib/onboarding/onboardingState'
import { BOARD_TOUR_ID, FEATURE_TOURS, findTour } from '../../lib/onboarding/tours'
import { TIPS, type Tip } from '../../lib/onboarding/tips'
import { TourOverlay } from './TourOverlay'
import { NudgeTip } from './NudgeTip'

// Lazy so `motion` (used only by the slides) stays out of the main chunk.
const IntroSlides = lazy(() => import('./IntroSlides'))

/** After a route change or load, let the page's own transition and data settle first. */
const PAGE_SETTLE_MS = 700
/** How long the board must be idle before a milestone tip is considered. */
const TIP_DELAY_MS = 5000
const TIP_AFTER_EDIT_MS = 2500

function usePath(): string {
  return useSyncExternalStore(
    (cb) => router.subscribe(() => cb()),
    () => router.state.location.pathname,
    () => '/',
  )
}

/** Pathname plus query, so a tab switch inside a page (Settings' `?tab=`) counts as a new place. */
function useLocationKey(): string {
  return useSyncExternalStore(
    (cb) => router.subscribe(() => cb()),
    () => router.state.location.pathname + router.state.location.search,
    () => '/',
  )
}

/**
 * Runs the onboarding layer (`docs/feat-onboarding.md`). Mounted from `App.tsx` as a
 * sibling of the router, like the other dialogs, so it reads the route from the exported
 * `router`. In order, and one thing at a time:
 *   1. the intro slides (fresh install only),
 *   2. the interactive board tour on `/`,
 *   3. a short tour the first time the user opens a major feature,
 *   4. at most one quiet milestone tip per session.
 * It waits for the same things the other dialogs do: a mandatory update, the web
 * "works best in the Android app" notice, and the workspace being loaded. Every tour records
 * its flag when it ends, finished or skipped, so nothing ever repeats.
 */
export function OnboardingHost() {
  const { result } = useAppUpdate()
  const noticeOpen = useMobileWebNoticeOpen()
  const { status } = useWorkspace()
  const { appliedAt } = useSync()
  const { pending: whatsNewPending } = useWhatsNew()
  const { authMethod } = useAuth()
  const { loaded, flags } = useFlags()
  const phase = useOnboardingPhase()
  const path = usePath()
  const locationKey = useLocationKey()
  // Tours already tried at this exact place without showing anything: don't retry in a loop.
  const tried = useRef<{ key: string; ids: Set<string> }>({ key: '', ids: new Set() })
  const [tip, setTip] = useState<Tip | null>(null)
  const [tipShownThisSession, setTipShownThisSession] = useState(false)

  const updateRequired = result?.updateAvailable === true && result.forceUpdate
  const blocked = updateRequired || noticeOpen || status !== 'ready' || !loaded
  const introDone = flags[INTRO_SEEN_KEY] === true
  const boardDone = flags[BOARD_TOUR_SEEN_KEY] === true
  const idle = phase.kind === 'idle'

  // Flags load once, then again whenever a sync pull wrote something (an account's own
  // flags may have just arrived and mean "already seen").
  useEffect(() => {
    void loadFlags()
  }, [appliedAt])

  // Start whatever is due next.
  useEffect(() => {
    if (blocked || !idle) return
    if (!introDone) {
      startIntro()
      return
    }
    let timer = 0
    if (!boardDone) {
      if (path === '/') timer = window.setTimeout(() => startTour(BOARD_TOUR_ID), PAGE_SETTLE_MS)
    } else if (!whatsNewPending) {
      if (tried.current.key !== locationKey) tried.current = { key: locationKey, ids: new Set() }
      const due = FEATURE_TOURS.find(
        (t) => t.matchPath?.(path) && flags[t.flagKey] !== true && !tried.current.ids.has(t.id),
      )
      if (due) {
        timer = window.setTimeout(() => {
          tried.current.ids.add(due.id)
          startTour(due.id)
        }, PAGE_SETTLE_MS)
      }
    }
    return () => window.clearTimeout(timer)
  }, [blocked, idle, introDone, boardDone, path, locationKey, flags, whatsNewPending])

  // A milestone tip: only on the board, only once everything else is done and quiet.
  const signedIn = authMethod === 'google'
  const tipEligible =
    !blocked && idle && introDone && boardDone && path === '/' && !whatsNewPending && !tip && !tipShownThisSession
  useEffect(() => {
    if (!tipEligible) return
    let timer = 0
    let cancelled = false
    async function evaluate() {
      const stats = await getOnboardingStats().catch(() => null)
      if (!stats || cancelled) return
      const found = TIPS.find((t) => flags[t.flagKey] !== true && t.when(stats, { signedIn }))
      if (found) {
        setTip(found)
        setTipShownThisSession(true)
      }
    }
    const schedule = (ms: number) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(evaluate, ms)
    }
    schedule(TIP_DELAY_MS)
    const off = onLocalChange(() => schedule(TIP_AFTER_EDIT_MS))
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      off()
    }
  }, [tipEligible, flags, signedIn])

  const finishIntro = useCallback(() => {
    markFlag(INTRO_SEEN_KEY)
    endPhase()
  }, [])

  const tourId = phase.kind === 'tour' ? phase.tourId : null
  const finishTour = useCallback(
    (shown: boolean) => {
      const tour = tourId ? findTour(tourId) : undefined
      // The board tour is first-run only: if the board has none of its anchors (a synced board
      // replaced the default one) there is nothing to retry, so it still counts as done.
      if (tour && (shown || tour.id === BOARD_TOUR_ID)) markFlag(tour.flagKey)
      endPhase()
    },
    [tourId],
  )

  const dismissTip = useCallback(() => {
    if (tip) markFlag(tip.flagKey)
    setTip(null)
  }, [tip])

  const acceptTip = useCallback(() => {
    if (tip) {
      markFlag(tip.flagKey)
      void router.navigate(tip.to, { viewTransition: true })
    }
    setTip(null)
  }, [tip])

  const activeTour = tourId ? findTour(tourId) : undefined

  return (
    <>
      {phase.kind === 'intro' && (
        <Suspense fallback={null}>
          <IntroSlides onDone={finishIntro} />
        </Suspense>
      )}
      {activeTour && <TourOverlay key={activeTour.id} tour={activeTour} onFinish={finishTour} />}
      {tip && idle && path === '/' && <NudgeTip tip={tip} onAccept={acceptTip} onDismiss={dismissTip} />}
    </>
  )
}
