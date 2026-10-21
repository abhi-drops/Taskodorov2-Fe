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
 * when it happened. Account-scoped (not cleared on logout): `loadSyncState` returns
 * `null` when the stored `accountId` doesn't match the one asked for, which is what
 * makes a *different* account's first sync on this device correctly hit `cursor:
 * null`, while the *same* account logging out and back in resumes incrementally
 * instead of re-triggering the first-sync "keep local vs use account" prompt every
 * time (docs/phase3-sync-plan-from-be.md §4) — a mis-tap on that prompt is
 * unrecoverable, so avoiding spurious re-prompts matters.
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
