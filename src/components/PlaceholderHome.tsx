import { useAuth } from '../lib/auth/useAuth'
import { Button } from './ui/Button'

export function PlaceholderHome() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
      <h1 className="text-2xl font-bold text-nav-dark">You're logged in</h1>
      {user && <p className="text-slate-600">{user.name} ({user.email})</p>}
      <Button variant="ghost" onClick={() => logout()}>
        Log out
      </Button>
    </div>
  )
}
