import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api/auth'
import {
  saveAuth,
  loadAuth,
  clearAuth,
  saveAuthMethod,
  loadAuthMethod,
  clearAuthMethod,
} from '../storage/preferences'
import { AuthContext } from './authContext'
import type { AuthState } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    status: 'hydrating',
    authMethod: null,
    error: null,
  })

  useEffect(() => {
    Promise.all([loadAuth(), loadAuthMethod()]).then(([persisted, authMethod]) => {
      setState((s) => ({
        ...s,
        ...(persisted ?? {}),
        authMethod: persisted ? authMethod : null,
        status: persisted ? 'authenticated' : 'unauthenticated',
      }))
    })
  }, [])

  async function login(email: string, password: string) {
    setState((s) => ({ ...s, error: null }))
    try {
      const { token, user } = await authApi.login({ email, password })
      await saveAuth(token, user)
      await saveAuthMethod('password')
      setState({ token, user, status: 'authenticated', authMethod: 'password', error: null })
    } catch (e) {
      setState((s) => ({ ...s, error: (e as Error).message }))
      throw e
    }
  }

  async function signup(email: string, password: string, name: string) {
    setState((s) => ({ ...s, error: null }))
    try {
      const { token, user } = await authApi.signup({ email, password, name })
      await saveAuth(token, user)
      await saveAuthMethod('password')
      setState({ token, user, status: 'authenticated', authMethod: 'password', error: null })
    } catch (e) {
      setState((s) => ({ ...s, error: (e as Error).message }))
      throw e
    }
  }

  async function loginWithGoogle(idToken: string) {
    setState((s) => ({ ...s, error: null }))
    try {
      const { token, user } = await authApi.google({ idToken })
      await saveAuth(token, user)
      await saveAuthMethod('google')
      setState({ token, user, status: 'authenticated', authMethod: 'google', error: null })
    } catch (e) {
      setState((s) => ({ ...s, error: (e as Error).message }))
      throw e
    }
  }

  async function logout() {
    await clearAuth()
    await clearAuthMethod()
    setState({ user: null, token: null, status: 'unauthenticated', authMethod: null, error: null })
  }

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
