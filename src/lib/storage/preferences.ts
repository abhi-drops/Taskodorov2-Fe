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

/** Mobile "tilt to move the + button" — on unless explicitly turned off. */
export async function loadTiltAddButtonEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: TILT_ADD_BUTTON_KEY })
  return value !== 'off'
}

export async function saveTiltAddButtonEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: TILT_ADD_BUTTON_KEY, value: enabled ? 'on' : 'off' })
}

const TILT_ADD_BUTTON_TRAVEL_KEY = 'taskodoro.ui.tiltAddButtonTravel'

/** How far down the + button may slide, in sixths of the screen height. */
export type TiltTravelSixths = 2 | 3 | 4
export const TILT_TRAVEL_OPTIONS: TiltTravelSixths[] = [2, 3, 4]
const DEFAULT_TILT_TRAVEL: TiltTravelSixths = 3

export async function loadTiltAddButtonTravel(): Promise<TiltTravelSixths> {
  const { value } = await Preferences.get({ key: TILT_ADD_BUTTON_TRAVEL_KEY })
  const parsed = Number(value)
  return TILT_TRAVEL_OPTIONS.includes(parsed as TiltTravelSixths) ? (parsed as TiltTravelSixths) : DEFAULT_TILT_TRAVEL
}

export async function saveTiltAddButtonTravel(sixths: TiltTravelSixths): Promise<void> {
  await Preferences.set({ key: TILT_ADD_BUTTON_TRAVEL_KEY, value: String(sixths) })
}
