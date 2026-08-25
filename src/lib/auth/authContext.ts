import { createContext } from 'react'
import type { User } from '../../types/auth'

export type AuthStatus = 'hydrating' | 'authenticated' | 'unauthenticated'

export interface AuthState {
  user: User | null
  token: string | null
  status: AuthStatus
  error: string | null
}

export interface AuthContextValue extends AuthState {
  login(email: string, password: string): Promise<void>
  signup(email: string, password: string, name: string): Promise<void>
  loginWithGoogle(idToken: string): Promise<void>
  logout(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
