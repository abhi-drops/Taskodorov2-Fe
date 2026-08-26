import { useAuth } from '../lib/auth/useAuth'
import { usePlatform } from '../lib/platform/usePlatform'
import { Button } from './ui/Button'
import { TopNav } from './ui/TopNav'
import { BottomNav } from './ui/BottomNav'

export function PlaceholderHome() {
  const { user, logout } = useAuth()
  const { isNative } = usePlatform()

  return (
    <div className="bg-grid flex min-h-svh flex-col">
      {!isNative && (
        <div className="flex justify-center p-6">
          <TopNav />
        </div>
      )}
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center ${isNative ? 'pb-24' : ''}`}
      >
        <h1 className="font-display text-2xl font-bold text-nav-dark">You're logged in</h1>
        {user && (
          <p className="text-slate-600">{user.name ? `${user.name} (${user.email})` : user.email}</p>
        )}
        <Button variant="ghost" onClick={() => logout()}>
          Log out
        </Button>
      </div>
      {isNative && <BottomNav />}
    </div>
  )
}
