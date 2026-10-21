import { Preferences } from '@capacitor/preferences'
import type { User } from '../../types/auth'

const TOKEN_KEY = 'taskodoro.auth.token'
const USER_KEY = 'taskodoro.auth.user'

export async function saveAuth(token: string, user: User): Promise<void> {
  await Preferences.set({ key: TOKEN_KEY, value: token })
  await Preferences.set({ key: USER_KEY, value: JSON.stringify(user) })
}

export async function loadAuth(): Promise<{ token: string; user: User } | null> {
  const { value: token } = await Preferences.get({ key: TOKEN_KEY })
  const { value: userJson } = await Preferences.get({ key: USER_KEY })
  if (!token || !userJson) return null
  return { token, user: JSON.parse(userJson) as User }
}

export async function clearAuth(): Promise<void> {
  await Preferences.remove({ key: TOKEN_KEY })
  await Preferences.remove({ key: USER_KEY })
}

const AUTH_METHOD_KEY = 'taskodoro.auth.method'

/**
 * How the current session signed in. Sync (Phase 3) is gated specifically on
 * `'google'` — logging in with email/password does not turn sync on — so this has to
 * be remembered across app restarts the same way the token/user are.
 */
export type AuthMethod = 'password' | 'google'

export async function saveAuthMethod(method: AuthMethod): Promise<void> {
  await Preferences.set({ key: AUTH_METHOD_KEY, value: method })
}

export async function loadAuthMethod(): Promise<AuthMethod | null> {
  const { value } = await Preferences.get({ key: AUTH_METHOD_KEY })
  return value === 'password' || value === 'google' ? value : null
}

export async function clearAuthMethod(): Promise<void> {
  await Preferences.remove({ key: AUTH_METHOD_KEY })
}

const ACTIVE_WORKSPACE_ID_KEY = 'taskodoro.workspace.activeId'

export async function saveActiveWorkspaceId(id: string): Promise<void> {
  await Preferences.set({ key: ACTIVE_WORKSPACE_ID_KEY, value: id })
}

export async function loadActiveWorkspaceId(): Promise<string | null> {
  const { value } = await Preferences.get({ key: ACTIVE_WORKSPACE_ID_KEY })
  return value
}

export async function clearActiveWorkspaceId(): Promise<void> {
  await Preferences.remove({ key: ACTIVE_WORKSPACE_ID_KEY })
}

const TILT_ADD_BUTTON_KEY = 'taskodoro.ui.tiltAddButton'

/**
 * Mobile "Dynamic Add Button" (idle shrink + tilt to wake/tuck the floating "+"), on
 * unless explicitly turned off. The key name predates the slide being removed and is
 * kept so existing choices carry over.
 */
export async function loadTiltAddButtonEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: TILT_ADD_BUTTON_KEY })
  return value !== 'off'
}

export async function saveTiltAddButtonEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: TILT_ADD_BUTTON_KEY, value: enabled ? 'on' : 'off' })
}

const ADD_BUTTON_POSITION_KEY = 'taskodoro.ui.addButtonPosition'

/** Vertical spot of the mobile floating "+". */
export type AddButtonPosition = 'high' | 'medium' | 'low'
export const ADD_BUTTON_POSITIONS: AddButtonPosition[] = ['high', 'medium', 'low']
const DEFAULT_ADD_BUTTON_POSITION: AddButtonPosition = 'medium'

export async function loadAddButtonPosition(): Promise<AddButtonPosition> {
  const { value } = await Preferences.get({ key: ADD_BUTTON_POSITION_KEY })
  return ADD_BUTTON_POSITIONS.includes(value as AddButtonPosition)
    ? (value as AddButtonPosition)
    : DEFAULT_ADD_BUTTON_POSITION
}

export async function saveAddButtonPosition(position: AddButtonPosition): Promise<void> {
  await Preferences.set({ key: ADD_BUTTON_POSITION_KEY, value: position })
}

const SYNC_STATE_KEY = 'taskodoro.sync.state'

/**
 * The opaque cursor from the last successful sync, which account it belongs to, and
 * when it happened. `SyncContext.tsx` clears this (and the local data it points at)
 * on every logout from a Google session — a device with no local data is never at risk
 * of a *different* account's next sign-in silently finding and uploading someone
 * else's leftover rows, and the next sign-in's `cursor: null` always does a full fresh
 * pull, same account or not. The `accountId` field is kept mainly as a sanity check
 * (`loadSyncState` ignores a stored record that doesn't match who's asking) rather than
 * something callers need to actively manage.
 */
export interface SyncState {
  accountId: string
  cursor: number
  lastSyncedAt: number
}

export async function saveSyncState(state: SyncState): Promise<void> {
  await Preferences.set({ key: SYNC_STATE_KEY, value: JSON.stringify(state) })
}

export async function loadSyncState(accountId: string): Promise<SyncState | null> {
  const { value } = await Preferences.get({ key: SYNC_STATE_KEY })
  if (!value) return null
  const state = JSON.parse(value) as SyncState
  return state.accountId === accountId ? state : null
}

export async function clearSyncState(): Promise<void> {
  await Preferences.remove({ key: SYNC_STATE_KEY })
}

const PENDING_FRESH_LOGIN_KEY = 'taskodoro.sync.pendingFreshLogin'

/**
 * Set whenever logout wipes this device's local data (`SyncContext.tsx`). The very
 * next sign-in's first sync is, by construction, a `cursor: null` request against
 * whatever cloud data that account already has — which the server treats as a genuine
 * conflict (409) regardless of how empty the local push is. Without this marker, that
 * would surface the "keep local vs use account" dialog on every ordinary logout→login
 * cycle, even back into the same account with nothing local worth keeping — exactly
 * the prompt this device-switch fix is supposed to avoid. `syncEngine.ts#doSync`
 * checks (and clears) this via `consumePendingFreshLogin()` the one time it matters:
 * when that first sync actually hits a 409. If set, it retries silently with
 * `strategy: 'use_account'` instead of asking. A later, unrelated conflict (e.g. true
 * multi-device first sync on a install that was never through this logout path) never
 * sees this marker set, so the dialog still shows exactly as before for that case.
 */
export async function markPendingFreshLogin(): Promise<void> {
  await Preferences.set({ key: PENDING_FRESH_LOGIN_KEY, value: '1' })
}

/** Reads and clears the marker in one step — it's meant to apply to the next conflict
 *  it's checked against, not linger and auto-resolve some later, unrelated one. */
export async function consumePendingFreshLogin(): Promise<boolean> {
  const { value } = await Preferences.get({ key: PENDING_FRESH_LOGIN_KEY })
  if (value !== null) await Preferences.remove({ key: PENDING_FRESH_LOGIN_KEY })
  return value !== null
}

const DEVICE_ID_KEY = 'taskodoro.sync.deviceId'

/**
 * A per-install id, independent of login session — generated once and persisted, never
 * regenerated while this install lives (a reinstall naturally gets a new one, which is
 * correct: from the account's perspective that's a new device). Sent on every `/sync`
 * call so the backend can tell whether another of the account's devices is active right
 * now (docs/phase3-sync-plan-from-be.md's device-activity section) — not tied to any one
 * account, since the same physical install could sync a different account later.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const { value } = await Preferences.get({ key: DEVICE_ID_KEY })
  if (value) return value
  const id = crypto.randomUUID()
  await Preferences.set({ key: DEVICE_ID_KEY, value: id })
  return id
}
