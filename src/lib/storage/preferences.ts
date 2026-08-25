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
