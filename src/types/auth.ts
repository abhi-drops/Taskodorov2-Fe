export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginPayload {
  email: string
  password: string
}

export interface SignupPayload {
  email: string
  password: string
  name: string
}

export interface GoogleAuthPayload {
  idToken: string
}
