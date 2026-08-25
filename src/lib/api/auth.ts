import { api } from './client'
import type {
  AuthResponse,
  LoginPayload,
  SignupPayload,
  GoogleAuthPayload,
} from '../../types/auth'

export const authApi = {
  signup: (payload: SignupPayload) =>
    api.post<AuthResponse>('/auth/signup', payload),
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload),
  google: (payload: GoogleAuthPayload) =>
    api.post<AuthResponse>('/auth/google', payload),
}
