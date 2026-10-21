import { createContext } from 'react'
import type { User } from '../../types/auth'
import type { AuthMethod } from '../storage/preferences'

export type AuthStatus = 'hydrating' | 'authenticated' | 'unauthenticated'

export interface AuthState {
  user: User | null
  token: string | null
  status: AuthStatus
  /** How the current session signed in — `null` when logged out. Sync (Phase 3) is
   *  gated specifically on `'google'`. */
  authMethod: AuthMethod | null
  error: string | null
}

export interface AuthContextValue extends AuthState {
  login(email: string, password: string): Promise<void>
  signup(email: string, password: string, name: string): Promise<void>
  loginWithGoogle(idToken: string): Promise<void>
  logout(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
