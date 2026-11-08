import { useEffect, useRef, useState, type RefObject } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { GoogleLogin } from '@react-oauth/google'
import { Link, useSearchParams } from 'react-router'
import { AppShell } from '../components/AppShell'
import { PowerToolsDesktopLayout, type PowerToolsTab } from '../components/PowerToolsSidebar'
import { CHIP, DANGER_CHIP } from '../components/SidebarPanelLayout'
import { BackLink } from '../components/ui/BackLink'
import { useAuth } from '../lib/auth/useAuth'
import { useSync } from '../lib/sync/useSync'
import { useAppUpdate } from '../lib/appUpdate/useAppUpdate'
import { useWhatsNew } from '../lib/whatsNew/useWhatsNew'
import { useGoogleSignIn } from '../common_logics/useGoogleSignIn'
import { useWorkspace } from '../lib/workspace/useWorkspace'
import { usePlatform } from '../lib/platform/usePlatform'
import { useScrolled } from '../lib/layout/useScrolled'
import { useBlurredPeek } from '../lib/layout/useBlurredPeek'
import { useIsHeaderBackdropSuppressed } from '../lib/layout/headerBackdropSuppression'
import { TapeBackdrop } from '../components/ui/TapeBackdrop'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import {
  AndroidIcon,
  CloseIcon,
  FeedbackIcon,
  GroupIcon,
  InstagramIcon,
  PlayIcon,
  ResetIcon,
  SettingsIcon,
  SyncIcon,
  TrashIcon,
  UpdateIcon,
  WebsiteIcon,
  WebVersionIcon,
  WhatsNewIcon,
} from '../components/ui/icons'
import taskodoroLogo from '../assets/logo.png'
import mavntLogo from '../assets/MAVNT_LOGO_TRANSPARENT.png'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useGroupForm } from '../common_logics/useGroupForm'
import { useAddButtonSettings } from '../common_logics/useAddButtonSettings'
import { Tabs } from '../components/ui/Tabs'
import { ADD_BUTTON_POSITIONS, type AddButtonPosition } from '../lib/storage/preferences'
import { listGroups, deleteGroup } from '../lib/db/groups'
import { wipeWorkspaceNotes } from '../lib/db/notes'
import { getCompletedGroupId, setCompletedGroupId } from '../lib/db/workspaces'
import { Select } from '../components/ui/Select'
import { resetToDefault } from '../lib/db/reset'
import { FormError } from '../components/ui/FormError'
import { FeedbackDialog } from '../components/FeedbackDialog'
import { clearFlags } from '../lib/onboarding/flags'
import { ALL_TOUR_FLAG_KEYS } from '../lib/onboarding/tours'
import { ALL_TIP_FLAG_KEYS } from '../lib/onboarding/tips'
import { INTRO_SEEN_KEY, BOARD_TOUR_SEEN_KEY } from '../lib/db/userStateSchema'
import type { Group } from '../types/group'
import type { AuthState } from '../lib/auth/authContext'

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-sm font-medium text-slate-600">{children}</h2>
}

// Desktop already shows the active tab in the sidebar, so the per-section
// `SectionHeading` below would just repeat it there — only the stacked mobile layout
// (where all sections show at once) needs it to tell sections apart.
const TAB_SUBTITLES: Record<PowerToolsTab, string> = {
  groups: 'Groups and workspace data.',
  account: 'Account, sync & reset.',
  about: 'App info, updates & links.',
}

const ADD_BUTTON_POSITION_LABELS: Record<AddButtonPosition, string> = { high: 'High', medium: 'Medium', low: 'Low' }

/** Mobile-only quick nav between Settings' stacked sections — all four are always on
 * screen at once (unlike the board's tabs, which switch which group is shown), so
 * selecting one here just scrolls to it rather than changing what's rendered. */
type SettingsSection = 'groups' | 'board' | 'account' | 'about'

const SETTINGS_NAV_TABS: { id: SettingsSection; label: string }[] = [
  { id: 'groups', label: 'Groups' },
  { id: 'board', label: 'Board' },
  { id: 'account', label: 'Account' },
  { id: 'about', label: 'About' },
]

/** Offsets a scroll target below the sticky nav strip's own height, so
 * `scrollIntoView` doesn't land a section's heading half-hidden underneath it. */
const SCROLL_OFFSET_CLASS = 'scroll-mt-20'

/**
 * Mobile only: a quick nav for jumping between Settings' sections, shown only once
 * scrolled past the Groups section's own heading (`groupsRef`) — unlike `HomePage`'s
 * `StickyGroupTabs`, which sits in flow right at the top of the board already (so
 * sticky positioning alone keeps it hidden until relevant), Settings' Groups section
 * starts right under a short intro, too close to the top for a plain `position:
 * sticky` placement to ever look "hidden" — it would just render immediately. So this
 * is `fixed` (not sticky, no flow space reserved) and stays invisible — `opacity-0`,
 * `inert` so it can't steal focus/taps while hidden — until `groupsRef`'s own measured
 * top has scrolled past the viewport's top edge, at which point it fades in over the
 * same 300ms as `TapeBackdrop`'s own transition (and fades back out on scrolling back
 * up), rather than popping in/out instantly. `fixed inset-x-0` also sidesteps the gap
 * `-mx-6`'s cancel-the-parent's-padding trick would otherwise leave once nested inside
 * this page's `max-w-sm` mobile wrapper (unlike `HomePage`, whose strip sits directly
 * inside `AppShell`'s own padded content div). Same "tape material" backdrop as
 * `StickyGroupTabs` otherwise.
 */
function StickySettingsTabs({
  groupsRef,
  sectionsRef,
  active,
  onSelect,
}: {
  groupsRef: RefObject<HTMLElement | null>
  sectionsRef: RefObject<HTMLElement | null>
  active: SettingsSection
  onSelect: (section: SettingsSection) => void
}) {
  const [groupsOffsetTop, setGroupsOffsetTop] = useState<number | null>(null)
  useEffect(() => {
    const measure = () => {
      if (groupsRef.current) setGroupsOffsetTop(groupsRef.current.getBoundingClientRect().top + window.scrollY)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [groupsRef])

  // Stays hidden (threshold effectively infinite) until the real offset is measured,
  // so there's no one-frame flash of the strip at the top before layout settles.
  const shown = useScrolled(groupsOffsetTop ?? Number.POSITIVE_INFINITY)
  const suppressed = useIsHeaderBackdropSuppressed()
  const [sectionsOffsetTop, setSectionsOffsetTop] = useState(0)
  const peekRef = useBlurredPeek(sectionsRef, sectionsOffsetTop, shown && !suppressed)

  useEffect(() => {
    const measure = () => {
      if (sectionsRef.current) setSectionsOffsetTop(sectionsRef.current.getBoundingClientRect().top + window.scrollY)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [sectionsRef])

  return (
    <div
      className={`fixed inset-x-0 top-0 z-20 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden={!shown}
      inert={!shown}
    >
      <TapeBackdrop active={!suppressed} peekRef={peekRef} blurPx={36} washOpacity={0.6} />
      <div className="relative mx-auto flex w-full max-w-sm gap-2 overflow-x-auto px-6 py-3" role="tablist">
        {SETTINGS_NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => onSelect(tab.id)}
            className={`shrink-0 rounded-card px-3.5 py-1.5 text-sm font-medium transition ${
              active === tab.id ? 'bg-ink text-white' : 'border border-slate-200 bg-white text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const WEB_VERSION_URL = 'https://taskodoro.mavnt.in/'
const ANDROID_VERSION_URL = 'https://www.mavnt.in/'
const MAVNT_WEBSITE_URL = 'https://www.mavnt.in/'
const MAVNT_INSTAGRAM_URL = 'https://www.instagram.com/mavn.t/'

/** Mobile-only: web has no floating "+". */
function BoardSection() {
  const { dynamic: enabled, dynamicAvailable, setDynamic: setEnabled, position, setPosition } = useAddButtonSettings()

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Board</SectionHeading>
      <button
        type="button"
        role="switch"
        aria-checked={enabled === true}
        disabled={enabled === null || !dynamicAvailable}
        onClick={() => setEnabled(!enabled)}
        className={`${CHIP} justify-between text-left disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="flex flex-col">
          <span className="font-medium text-ink">Dynamic Add Button</span>
          {!dynamicAvailable && <span className="text-sm text-slate-600">Android app only</span>}
        </span>
        <span className="shrink-0 font-display text-sm font-bold uppercase text-ink">
          {enabled === null ? '' : enabled ? 'On' : 'Off'}
        </span>
      </button>
      {position !== null && (
        <div className={`${CHIP} flex-col items-stretch gap-2`}>
          <span className="font-medium text-ink">Add Button Position</span>
          <Tabs
            options={ADD_BUTTON_POSITIONS.map((p) => ({ label: ADD_BUTTON_POSITION_LABELS[p], value: p }))}
            value={position}
            onChange={(value) => setPosition(value as AddButtonPosition)}
          />
        </div>
      )}
    </div>
  )
}

function GroupsSection({
  groups,
  name,
  setName,
  handleCreate,
  onDeleteRequest,
  completedGroupId,
  onCompletedGroupChange,
  onWipeRequest,
  showHeading = true,
}: {
  groups: Group[]
  name: string
  setName: (value: string) => void
  handleCreate: () => void
  onDeleteRequest: (group: Group) => void
  completedGroupId: string | null
  onCompletedGroupChange: (groupId: string | null) => void
  onWipeRequest: () => void
  showHeading?: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {showHeading && <SectionHeading>Groups</SectionHeading>}
      {groups.map((group) => (
        <div key={group.id} className={CHIP}>
          <AnimatedIcon icon={GroupIcon} size={20} still className="text-ink" />
          <span className="flex-1 truncate font-medium text-ink">{group.name}</span>
          <Link
            to={`/settings/groups/${group.id}`}
            aria-label={`${group.name} settings`}
            data-tour="group-gear"
            className="shrink-0 text-ink hover:opacity-70"
          >
            <AnimatedIcon icon={SettingsIcon} size={18} />
          </Link>
          <button
            type="button"
            onClick={() => onDeleteRequest(group)}
            aria-label={`Delete ${group.name}`}
            className="shrink-0 text-ink hover:opacity-70"
          >
            <AnimatedIcon icon={CloseIcon} size={18} />
          </button>
        </div>
      ))}

      <div className={`${CHIP} justify-between`}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate()
          }}
          placeholder="+ New group"
          className="min-w-0 flex-1 bg-transparent font-medium text-ink outline-none placeholder:text-ink/50"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="shrink-0 font-display text-sm font-bold uppercase text-ink hover:opacity-70"
        >
          Add
        </button>
      </div>

      {/* Diary: notes moved or created into this group count as "Completed" for the day. */}
      <div className="flex flex-col gap-1.5 pt-2">
        <Select
          label="Completed Group"
          value={completedGroupId ?? 'none'}
          onChange={(value) => onCompletedGroupChange(value === 'none' ? null : value)}
          options={[{ value: 'none', label: 'None' }, ...groups.map((group) => ({ value: group.id, label: group.name }))]}
        />
        <p className="px-1 text-xs text-slate-600">
          Notes moved into this group count as Completed in the Diary.
        </p>
      </div>

      {/* Empties this workspace's board. Groups, their settings and the Diary stay. */}
      <div className="flex flex-col gap-1.5 pt-2">
        <button type="button" onClick={onWipeRequest} className={DANGER_CHIP}>
          <AnimatedIcon icon={TrashIcon} size={16} />
          Wipe All Notes
        </button>
        <p className="px-1 text-xs text-slate-600">
          Removes every note in this workspace. Its groups and Diary history are kept.
        </p>
      </div>
    </div>
  )
}

// A full independent class string rather than `${CHIP} flex-col ...` — CHIP's own
// `flex items-center gap-3` would conflict on `align-items`/`gap` with anything
// appended after it (two same-specificity Tailwind utilities for the same property
// have no guaranteed winner by JSX class-string order; see `Modal.tsx`'s
// `overlayClassName`/`panelClassName` doc for the same rule). Still the board's chip
// anatomy (`rounded-card border-[3px] border-ink shadow-card`), just a column layout.
const GOOGLE_CONNECT_CARD = 'flex flex-col gap-3 rounded-card border-[3px] border-ink bg-white p-4 shadow-card'

/**
 * Sync is gated specifically on having signed in with Google — not on any
 * authenticated session — which is why this chip is its own control, separate from
 * the generic Account row above: a user logged in with email/password sees "Account"
 * as authenticated but this chip still reads as off, and tapping it runs Google
 * Sign-In right here rather than requiring a trip through the Account section.
 */
function SyncChip({ highlight = false }: { highlight?: boolean }) {
  const sync = useSync()
  const { isReady, isSubmitting, error, handleNativeSignIn, handleWebCredential } = useGoogleSignIn(null)
  const { isNative } = usePlatform()
  const busy = sync.status === 'syncing' || isSubmitting

  const connecting = sync.status === 'disabled'
  const needsGoogleAuth = connecting || (sync.status === 'error' && sync.failure === 'unauthorized')

  // Deep-linked from `SyncStatusBadge` (`?focus=sync`): scroll the chip into view and
  // blink a purple outline around it so it's unmissable. `focus-ring-blink` runs its
  // 4 x 0.5s = 2s animation once on mount and then just stops — no timer needed to
  // remove it.
  //
  // Scrolling can't just happen on mount: this page still has async content above the
  // chip settling in afterwards (the mobile layout's `GroupsSection` groups fetch, the
  // "Add Button Position" chip appearing once `useAddButtonSettings` loads, the
  // slide/fade page-transition animation itself), each of which shifts the chip's
  // position after mount. So this polls the chip's position on animation frames until
  // it holds still for a few frames in a row, then scrolls — instead of scrolling
  // against a layout that's still settling and landing short.
  const highlightRef = useRef<HTMLDivElement & HTMLButtonElement>(null)

  useEffect(() => {
    if (!highlight) return
    let cancelled = false
    let rafId: number
    let lastTop: number | null = null
    let stableFrames = 0
    let framesPolled = 0
    const MAX_FRAMES = 120 // ~2s at 60fps — a safety cap, not an expected case

    function tick() {
      if (cancelled) return
      const el = highlightRef.current
      const top = el?.getBoundingClientRect().top ?? null
      stableFrames = top !== null && lastTop !== null && Math.abs(top - lastTop) < 1 ? stableFrames + 1 : 0
      lastTop = top
      framesPolled++
      if (stableFrames >= 5 || framesPolled >= MAX_FRAMES) {
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [highlight])

  const highlightClass = highlight ? 'focus-ring-blink' : ''

  // Web has no programmatic trigger for Google's popup/One Tap flow — the real
  // "Sign in with Google" button has to be the thing the user taps. Rendering our own
  // chip as a second, look-alike button right above it (as this used to do) reads as
  // two separate, competing "sign in with Google" prompts stacked together. One
  // merged card instead: a label/description, then the one real button underneath —
  // nothing else here pretends to be clickable. Native has no such problem (the chip
  // itself genuinely drives the system account picker there), so it keeps using the
  // single clickable-chip shape below, same as the already-connected status chip.
  if (needsGoogleAuth && !isNative) {
    return (
      <div ref={highlightRef} className={`${GOOGLE_CONNECT_CARD} ${highlightClass}`}>
        <div className="flex items-center gap-3">
          <AnimatedIcon icon={SyncIcon} size={20} className="text-ink" still />
          <div className="flex flex-col">
            <span className="font-medium text-ink">Sync With Google</span>
            <span className="text-sm text-slate-600">
              {!isReady
                ? 'Google Sign-In not configured yet.'
                : sync.status === 'error'
                  ? 'Your session expired. Sign in again to sync.'
                  : 'Sign in with Google to sync your board.'}
            </span>
          </div>
        </div>
        {isReady &&
          (isSubmitting ? (
            <Spinner size={20} />
          ) : (
            // No local <GoogleOAuthProvider> here — one already wraps the whole app
            // (`App.tsx`), so this just needs the <GoogleLogin> button itself.
            <GoogleLogin
              onSuccess={(credential) => {
                if (credential.credential) handleWebCredential(credential.credential)
              }}
            />
          ))}
        <FormError message={error} />
      </div>
    )
  }

  function detailFor(): string {
    switch (sync.status) {
      case 'syncing':
        return 'Syncing…'
      case 'needs-strategy':
        return "This device hasn't synced yet. Pick what to keep."
      case 'offline':
        return 'Offline — your changes are saved here and will sync later.'
      case 'error':
        // 'unauthorized' on native only here — the web case already returned above.
        return sync.failure === 'unauthorized'
          ? 'Your session expired. Tap to sign in again.'
          : 'Last sync failed.'
      case 'idle':
        return sync.lastSyncedAt
          ? `Synced ${formatDistanceToNow(sync.lastSyncedAt, { addSuffix: true })}.`
          : 'Not synced yet.'
      default:
        return ''
    }
  }

  function valueFor(): string {
    switch (sync.status) {
      case 'needs-strategy':
        return 'Choose'
      case 'offline':
        return 'Retry'
      case 'error':
        return sync.failure === 'unauthorized' ? 'Log In' : 'Retry'
      default:
        return 'Sync Now'
    }
  }

  function handleClick() {
    // Only reachable here when native (needsGoogleAuth + web already returned above).
    if (needsGoogleAuth) {
      handleNativeSignIn()
      return
    }
    sync.syncNow()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        ref={highlightRef}
       
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`${CHIP} w-full justify-between text-left disabled:cursor-not-allowed disabled:opacity-50 ${highlightClass}`}
      >
        <span className="flex items-center gap-3">
          <AnimatedIcon icon={SyncIcon} size={20} className="text-ink" />
          <span className="flex flex-col">
            <span className="font-medium text-ink">Sync With Google</span>
            <span className="text-sm text-slate-600">{detailFor()}</span>
          </span>
        </span>
        {busy ? (
          <Spinner size={16} />
        ) : (
          <span className="shrink-0 font-display text-sm font-bold uppercase text-ink">{valueFor()}</span>
        )}
      </button>
      {/* Only ever relevant on native here — a web sign-in failure is shown inside
          the merged card above instead, where the GoogleLogin button actually is. */}
      {isNative && needsGoogleAuth && <FormError message={error} />}
    </div>
  )
}

/** Native only — an Android-distribution concern, see
 * `docs/feat-app-update-check-from-be.md`. Mirrors `SyncChip`'s shape: a status line
 * plus a manual trigger, here `checkNow()` from `AppUpdateProvider` (which also runs
 * this once automatically on app launch — this chip just lets the user re-run it and
 * see the result without waiting for the dismissible banner). */
function UpdateChip() {
  const { isNative } = usePlatform()
  const { status, result, currentVersionName, checkNow } = useAppUpdate()
  const busy = status === 'checking'

  if (!isNative) return null

  function detailFor(): string {
    if (busy) return 'Checking…'
    if (status === 'error') return "Couldn't check for updates."
    if (result?.updateAvailable) return `Version ${result.latestVersion} is available.`
    if (currentVersionName) return `You're on the latest version (v${currentVersionName}).`
    return 'Tap to check for updates.'
  }

  return (
    <button
      type="button"
      onClick={checkNow}
      disabled={busy}
      className={`${CHIP} w-full justify-between text-left disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span className="flex items-center gap-3">
        <AnimatedIcon icon={UpdateIcon} size={20} className="text-ink" />
        <span className="flex flex-col">
          <span className="font-medium text-ink">App Updates</span>
          <span className="text-sm text-slate-600">{detailFor()}</span>
        </span>
      </span>
      {busy ? (
        <Spinner size={16} />
      ) : (
        <span className="shrink-0 font-display text-sm font-bold uppercase text-ink">Check</span>
      )}
    </button>
  )
}

/** Both platforms: reopens the release notes (latest few, newest first) after the
 * one-time "What's new" dialog has been dismissed. See `docs/feat-release-notes-from-be.md`
 * §4.D. */
function WhatsNewChip() {
  const { browseStatus, openLatest } = useWhatsNew()
  const busy = browseStatus === 'loading'

  return (
    <button
      type="button"
      onClick={openLatest}
      disabled={busy}
      className={`${CHIP} w-full justify-between text-left disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span className="flex items-center gap-3">
        <AnimatedIcon icon={WhatsNewIcon} size={20} className="text-ink" />
        <span className="flex flex-col">
          <span className="font-medium text-ink">What's New</span>
          <span className="text-sm text-slate-600">
            {browseStatus === 'error' ? "Couldn't load release notes." : 'See what changed in recent versions.'}
          </span>
        </span>
      </span>
      {busy ? (
        <Spinner size={16} />
      ) : (
        <span className="shrink-0 font-display text-sm font-bold uppercase text-ink">View</span>
      )}
    </button>
  )
}

/** Both platforms: puts the first-run intro and board tour back (it starts at once), or
 * clears every first-visit tour and milestone tip so they show again. Both write synced
 * flags (`docs/feat-onboarding.md`). */
function OnboardingChips() {
  const [tipsReset, setTipsReset] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => clearFlags([INTRO_SEEN_KEY, BOARD_TOUR_SEEN_KEY])}
        className={`${CHIP} w-full justify-between text-left`}
      >
        <span className="flex items-center gap-3">
          <AnimatedIcon icon={PlayIcon} size={20} className="text-ink" />
          <span className="flex flex-col">
            <span className="font-medium text-ink">Replay Intro</span>
            <span className="text-sm text-slate-600">Watch the welcome slides and board tour again.</span>
          </span>
        </span>
        <span className="shrink-0 font-display text-sm font-bold uppercase text-ink">Play</span>
      </button>
      <button
        type="button"
        onClick={() => {
          clearFlags([...ALL_TOUR_FLAG_KEYS, ...ALL_TIP_FLAG_KEYS])
          setTipsReset(true)
        }}
        className={`${CHIP} w-full justify-between text-left`}
      >
        <span className="flex items-center gap-3">
          <AnimatedIcon icon={ResetIcon} size={20} className="text-ink" />
          <span className="flex flex-col">
            <span className="font-medium text-ink">Reset Tips</span>
            <span className="text-sm text-slate-600">
              {tipsReset ? 'Done. Tips show again as you explore.' : 'Show the first-visit tips for each feature again.'}
            </span>
          </span>
        </span>
        <span className="shrink-0 font-display text-sm font-bold uppercase text-ink">Reset</span>
      </button>
    </>
  )
}

function AccountSection({
  auth,
  onResetRequest,
  focusSync,
  showHeading = true,
}: {
  auth: Pick<AuthState, 'user' | 'status'> & { logout: () => Promise<void> }
  onResetRequest: () => void
  focusSync: boolean
  showHeading?: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {showHeading && <SectionHeading>Account</SectionHeading>}

      {auth.status === 'authenticated' && (
        <div className={`${CHIP} justify-between`}>
          <span className="truncate font-medium text-ink">
            {auth.user?.name ? `${auth.user.name} (${auth.user.email})` : auth.user?.email}
          </span>
          <Button variant="ghost" onClick={auth.logout}>
            Log out
          </Button>
        </div>
      )}

      {/* No separate Log in/Sign up links here — the Sync With Google card below is
          the one sign-in entry point in Settings, since sync needs Google either way;
          email/password login still works, just isn't offered from this page. */}
      <SyncChip highlight={focusSync} />

      <button type="button" onClick={onResetRequest} className={DANGER_CHIP}>
        Reset To Default
      </button>
    </div>
  )
}

// Hero card for the app's own identity — a bigger, standalone moment (large logo,
// large name) rather than just another row among the link chips below it. A fixed
// 30:70 grid (not `flex` + intrinsic sizing) so the logo column's width stays exactly
// 30% regardless of how long the name/tagline text runs.
const HERO_CARD =
  'grid grid-cols-[30%_70%] items-center gap-4 rounded-card border-[3px] border-ink bg-white p-6 shadow-card'

// Square icon-tile used for the two secondary links (cross-platform version,
// Instagram) — a 2-up grid reads as a distinct "links" row rather than more rows of
// the same `CHIP` shape repeated down the page.
const LINK_TILE =
  'flex flex-col items-center justify-center gap-2 rounded-card border-[3px] border-ink bg-white p-5 text-center shadow-card transition hover:opacity-90'

// Mirrors `android/app/build.gradle`'s `versionName` — the native fallback before
// `useAppUpdate`'s `currentVersionName` resolves from `getNativeAppInfo()`. Web doesn't
// need it: it shows the version baked in from `web-version.json`.
const APP_VERSION_FALLBACK = '0.1 beta'

/** App identity, the MAVNT parent-org link and the native-only update check — grouped
 * together as the one place in Settings that isn't about this device's data. */
function AboutSection({ showHeading = true }: { showHeading?: boolean }) {
  const { isNative } = usePlatform()
  const { currentVersionName } = useAppUpdate()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const version = isNative ? (currentVersionName ?? APP_VERSION_FALLBACK) : __APP_VERSION__
  // Cross-link to the other platform's build — on native that's the web app, on web
  // that's the Android app — rather than linking back to the version already in use.
  const otherPlatformUrl = isNative ? WEB_VERSION_URL : ANDROID_VERSION_URL
  const otherPlatformLabel = isNative ? 'Web Version' : 'Android Version'
  const otherPlatformIcon = isNative ? WebVersionIcon : AndroidIcon

  return (
    <div className="flex flex-col gap-3">
      {showHeading && <SectionHeading>About</SectionHeading>}

      <div className={HERO_CARD}>
        <img src={taskodoroLogo} alt="" className="aspect-square w-full rounded-card object-contain" />
        {/* `@container` + `cqw` sizes the text off this column's own rendered width —
            not viewport breakpoints — since the column's actual width depends on
            whether the desktop sidebar is present, not just window size (a `sm:`/`lg:`
            breakpoint pass overflowed the card at in-between desktop widths where the
            column is narrower than the viewport alone would suggest). `min-w-0` is
            required alongside it: a flex item's default `min-width: auto` lets long
            text overflow its flex parent instead of wrapping/shrinking. */}
        <div className="@container flex min-w-0 flex-col items-start gap-2">
          <span className="font-display text-[clamp(1.5rem,15cqw,4.5rem)] font-bold leading-none text-ink">
            Taskodoro
          </span>
          <span className="text-[clamp(0.8rem,5cqw,1.25rem)] text-slate-600">Your Comfort Planner</span>
          <span className="mt-1 shrink-0 rounded-card border-2 border-ink bg-sticky-yellow px-3 py-1.5 font-display text-[clamp(0.7rem,3.5cqw,1rem)] font-bold uppercase text-ink">
            v{version}
          </span>
        </div>
      </div>

      <UpdateChip />

      <WhatsNewChip />

      <OnboardingChips />

      <button type="button" onClick={() => setFeedbackOpen(true)} className={`${CHIP} w-full justify-between text-left`}>
        <span className="flex items-center gap-3">
          <AnimatedIcon icon={FeedbackIcon} size={20} className="text-ink" />
          <span className="flex flex-col">
            <span className="font-medium text-ink">Send Feedback</span>
            <span className="text-sm text-slate-600">Rate Taskodoro or tell us what to improve.</span>
          </span>
        </span>
        <span className="shrink-0 font-display text-sm font-bold uppercase text-ink">Send</span>
      </button>
      {feedbackOpen && <FeedbackDialog isOpen mode="manual" onClose={() => setFeedbackOpen(false)} />}

      <div className="grid grid-cols-2 gap-3">
        <a href={otherPlatformUrl} target="_blank" rel="noreferrer" className={LINK_TILE}>
          <AnimatedIcon icon={otherPlatformIcon} size={28} className="text-ink" />
          <span className="font-medium text-ink">{otherPlatformLabel}</span>
        </a>
        <a href={MAVNT_INSTAGRAM_URL} target="_blank" rel="noreferrer" className={LINK_TILE}>
          <AnimatedIcon icon={InstagramIcon} size={28} className="text-ink" />
          <span className="flex flex-col">
            <span className="font-medium text-ink">Instagram</span>
            <span className="text-xs text-slate-500">@mavn.t</span>
          </span>
        </a>
      </div>

      <a
        href={MAVNT_WEBSITE_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-4 rounded-card border-[3px] border-ink bg-white p-4 shadow-card transition hover:opacity-90"
        aria-label="MAVNT — visit website"
      >
        <img src={mavntLogo} alt="" className="h-20 w-20 shrink-0 object-contain" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">A product by</span>
          <span className="font-display text-xl font-bold text-ink">MAVNT</span>
          <span className="text-sm text-slate-600">Free &amp; Opensource</span>
        </span>
        <AnimatedIcon icon={WebsiteIcon} size={24} className="shrink-0 text-ink" />
      </a>
    </div>
  )
}

export default function PowerToolsPage() {
  const auth = useAuth()
  const { activeWorkspaceId, workspaces } = useWorkspace()
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)
  const { isMobile } = usePlatform()
  const [searchParams] = useSearchParams()
  // Anything other than 'account'/'about' (including an old `?tab=addons` link) lands on Groups.
  const tabParam = searchParams.get('tab')
  const activeTab: PowerToolsTab = tabParam === 'account' ? 'account' : tabParam === 'about' ? 'about' : 'groups'
  // `SyncStatusBadge` deep-links here with `?focus=sync` to highlight the Sync chip.
  const focusSync = searchParams.get('focus') === 'sync'

  const [groups, setGroups] = useState<Group[]>([])
  const [completedGroupId, setCompletedGroupIdState] = useState<string | null>(null)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<Group | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!activeWorkspaceId) return
      const [loaded, completed] = await Promise.all([
        listGroups(activeWorkspaceId),
        getCompletedGroupId(activeWorkspaceId),
      ])
      if (cancelled) return
      setGroups(loaded)
      setCompletedGroupIdState(completed)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId])

  async function refreshGroups() {
    if (!activeWorkspaceId) {
      setGroups([])
      return
    }
    setGroups(await listGroups(activeWorkspaceId))
  }

  const { name, setName, handleCreate } = useGroupForm(activeWorkspaceId, refreshGroups)

  async function handleDeleteGroup() {
    if (!confirmDeleteGroup) return
    await deleteGroup(confirmDeleteGroup.id)
    await refreshGroups()
  }

  async function handleWipe() {
    if (!activeWorkspaceId) return
    await wipeWorkspaceNotes(activeWorkspaceId)
  }

  async function handleReset() {
    await resetToDefault()
    window.location.reload()
  }

  async function handleCompletedGroupChange(groupId: string | null) {
    if (!activeWorkspaceId) return
    setCompletedGroupIdState(groupId)
    await setCompletedGroupId(activeWorkspaceId, groupId)
  }

  // Mobile only: section wrappers for `StickySettingsTabs` — both as scrollspy
  // observation targets and as `scrollIntoView` destinations for its tabs.
  const groupsSectionRef = useRef<HTMLDivElement>(null)
  const boardSectionRef = useRef<HTMLDivElement>(null)
  const accountSectionRef = useRef<HTMLDivElement>(null)
  const aboutSectionRef = useRef<HTMLDivElement>(null)
  const settingsSectionsRef = useRef<HTMLDivElement>(null)
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSection>('groups')

  // Mobile only: tracks which section the sticky strip should highlight as the user
  // scrolls — the last section (in order) whose top has crossed the "just below the
  // strip" line wins, same rule a scrollspy nav normally uses. Picking the section
  // nearest-above-zero rather than "whichever is currently intersecting" matters once
  // a later, short section (e.g. About) reaches the bottom of the page without being
  // able to fill the viewport: an earlier section further off-screen above would
  // otherwise still count as "visible" and wrongly win.
  useEffect(() => {
    if (!isMobile) return
    const sectionRefs: [SettingsSection, RefObject<HTMLDivElement | null>][] = [
      ['groups', groupsSectionRef],
      ['board', boardSectionRef],
      ['account', accountSectionRef],
      ['about', aboutSectionRef],
    ]
    const STRIP_LINE_PX = 96 // just below the sticky strip's own height

    let frame = 0
    const check = () => {
      // Pinned to the last section once scrolled to the bottom of the page: About
      // (the last/shortest section) can end the document before its own top is able
      // to reach STRIP_LINE_PX, since the page can't scroll any further to get it
      // there — the threshold loop below would otherwise strand the previous
      // section's tab highlighted forever.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom) {
        setActiveSettingsSection(sectionRefs[sectionRefs.length - 1][0])
        return
      }
      let current: SettingsSection = sectionRefs[0][0]
      for (const [id, ref] of sectionRefs) {
        if (!ref.current) continue
        if (ref.current.getBoundingClientRect().top <= STRIP_LINE_PX) current = id
      }
      setActiveSettingsSection(current)
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(check)
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [isMobile])

  const sectionRefById: Record<SettingsSection, RefObject<HTMLDivElement | null>> = {
    groups: groupsSectionRef,
    board: boardSectionRef,
    account: accountSectionRef,
    about: aboutSectionRef,
  }

  function scrollToSettingsSection(section: SettingsSection) {
    sectionRefById[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const groupsSection = (
    <GroupsSection
      groups={groups}
      name={name}
      setName={setName}
      handleCreate={handleCreate}
      onDeleteRequest={setConfirmDeleteGroup}
      completedGroupId={completedGroupId}
      onCompletedGroupChange={handleCompletedGroupChange}
      onWipeRequest={() => setConfirmWipe(true)}
      showHeading={isMobile}
    />
  )
  const accountSection = (
    <AccountSection
      auth={auth}
      onResetRequest={() => setConfirmReset(true)}
      focusSync={focusSync}
      showHeading={isMobile}
    />
  )
  const aboutSection = <AboutSection showHeading={isMobile} />

  return (
    <AppShell>
      <BackLink />
      {isMobile ? (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
            <p className="text-slate-600">Groups, account & sync.</p>
          </div>
          <StickySettingsTabs
            groupsRef={groupsSectionRef}
            sectionsRef={settingsSectionsRef}
            active={activeSettingsSection}
            onSelect={scrollToSettingsSection}
          />
          <div ref={settingsSectionsRef} className="flex flex-col gap-8">
            <div ref={groupsSectionRef} className={SCROLL_OFFSET_CLASS}>
              {groupsSection}
            </div>
            <div ref={boardSectionRef} className={SCROLL_OFFSET_CLASS}>
              <BoardSection />
            </div>
            <div ref={accountSectionRef} className={SCROLL_OFFSET_CLASS}>
              {accountSection}
            </div>
            <div ref={aboutSectionRef} className={SCROLL_OFFSET_CLASS}>
              {aboutSection}
            </div>
          </div>
        </div>
      ) : (
        <PowerToolsDesktopLayout activeTab={activeTab}>
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
              <p className="text-slate-600">{TAB_SUBTITLES[activeTab]}</p>
            </div>
            {activeTab === 'account' && accountSection}
            {activeTab === 'about' && aboutSection}
            {activeTab === 'groups' && groupsSection}
          </div>
        </PowerToolsDesktopLayout>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteGroup !== null}
        onClose={() => setConfirmDeleteGroup(null)}
        onConfirm={handleDeleteGroup}
        title="Delete group"
        message={`Delete "${confirmDeleteGroup?.name}" and every note in it?`}
      />

      <ConfirmDialog
        isOpen={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        onConfirm={handleWipe}
        title="Wipe all notes"
        message={`Remove every note in "${activeWorkspace?.name ?? 'this workspace'}"? Its groups, their settings and the Diary's history are kept, but the notes can't be brought back.`}
        confirmLabel="Wipe"
      />

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Reset to Default"
        message="This erases everything Taskodoro has stored on this device: every workspace, group and note, the Diary's history, your own templates and your settings. It also signs you out here. The app starts again as new. This can't be undone."
        confirmLabel="Reset"
      />
    </AppShell>
  )
}
