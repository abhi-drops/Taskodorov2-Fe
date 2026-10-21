import { useState } from 'react'
import { Modal } from './ui/Modal'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { DIALOG_OVERLAY, DIALOG_SHADOW } from './ui/dialogStyles'
import { usePlatform } from '../lib/platform/usePlatform'
import { useSync } from '../lib/sync/useSync'
import type { SyncStrategy } from '../types/sync'

// A full independent class string rather than `${CHIP} flex-col items-stretch gap-1`:
// CHIP's own `flex items-center gap-3` would conflict on `align-items`/`gap` with
// anything appended after it, and two same-specificity Tailwind utilities for the same
// property have no guaranteed winner by JSX class-string order (see `Modal.tsx`'s
// `overlayClassName`/`panelClassName` doc for the same rule). This still matches the
// board's chip anatomy (`rounded-card border-[3px] border-ink shadow-card`), just laid
// out for two lines of left-aligned text instead of one row.
const OPTION_CHIP =
  'flex flex-col items-stretch gap-1 rounded-card border-[3px] border-ink bg-white px-4 py-3 text-left shadow-card'

/**
 * The first-sync conflict prompt (docs/phase3-sync-plan-from-be.md §4): this device
 * has never synced and the account already has data elsewhere, so the user has to
 * choose which side wins before anything is applied. Rendered from `App.tsx` itself
 * (not only from Settings), since a Google sign-in can trigger this right over the
 * board on a fresh device, not just when the user happens to be in Settings.
 *
 * Not built on `ConfirmDialog` directly — this needs two equal, mutually destructive
 * choices with their own explanations, not one Cancel/danger-button pair. Each choice
 * still gets a `ConfirmDialog` as its own second step: this is a one-time,
 * irreversible, whole-dataset decision, and an accidental tap is exactly the failure
 * mode a second confirmation exists to prevent elsewhere in this app.
 */
export function SyncStrategyDialog() {
  const { strategyPromptOpen, dismissStrategyPrompt, resolveStrategy } = useSync()
  const { isMobile } = usePlatform()
  const [pending, setPending] = useState<SyncStrategy | null>(null)

  async function confirm() {
    if (!pending) return
    const strategy = pending
    setPending(null)
    await resolveStrategy(strategy)
  }

  return (
    <>
      <Modal
        isOpen={strategyPromptOpen && pending === null}
        onClose={dismissStrategyPrompt}
        title="Set up sync on this device"
        variant={isMobile ? 'full-page' : 'center'}
        overlayClassName={DIALOG_OVERLAY}
        panelClassName={DIALOG_SHADOW}
      >
        <div className="flex flex-col gap-4">
          <p className="text-slate-700">
            Your account already has data on another device. Choose what this device should keep — the other side
            is replaced.
          </p>
          <button type="button" onClick={() => setPending('keep_local')} className={OPTION_CHIP}>
            <span className="font-medium text-ink">Keep this device's data</span>
            <span className="text-sm text-slate-600">
              Your account's current data is replaced with what's on this device.
            </span>
          </button>
          <button type="button" onClick={() => setPending('use_account')} className={OPTION_CHIP}>
            <span className="font-medium text-ink">Use my account's data</span>
            <span className="text-sm text-slate-600">
              This device's workspaces, notes, Diary history and templates are replaced with what's on your
              account.
            </span>
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        title={pending === 'keep_local' ? "Keep this device's data?" : "Use your account's data?"}
        message={
          pending === 'keep_local'
            ? "Anything only on your other devices is removed. This can't be undone."
            : "Anything only on this device is lost. This can't be undone."
        }
        confirmLabel="Replace"
      />
    </>
  )
}
