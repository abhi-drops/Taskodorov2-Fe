import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api/auth'
import { saveAuth, loadAuth, clearAuth } from '../storage/preferences'
import { AuthContext } from './authContext'
import type { AuthState } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    status: 'hydrating',
    error: null,
  })

  useEffect(() => {
    loadAuth().then((persisted) => {
      setState((s) => ({
        ...s,
        ...(persisted ?? {}),
        status: persisted ? 'authenticated' : 'unauthenticated',
      }))
    })
  }, [])

  async function login(email: string, password: string) {
    setState((s) => ({ ...s, error: null }))
    try {
      const { token, user } = await authApi.login({ email, password })
      await saveAuth(token, user)
      setState({ token, user, status: 'authenticated', error: null })
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
      setState({ token, user, status: 'authenticated', error: null })
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
      setState({ token, user, status: 'authenticated', error: null })
    } catch (e) {
      setState((s) => ({ ...s, error: (e as Error).message }))
      throw e
    }
  }

  async function logout() {
    await clearAuth()
    setState({ user: null, token: null, status: 'unauthenticated', error: null })
  }

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
