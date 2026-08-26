import { Link } from 'react-router'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../lib/auth/useAuth'
import { Button } from '../components/ui/Button'

export default function PowerToolsPage() {
  const { user, status, logout } = useAuth()

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-nav-dark">Power Tools</h1>
          <p className="text-slate-600">Groups, Pomodoro, and the rest land in phase 2.4.</p>
        </div>

        <div className="flex flex-col gap-3 rounded-card bg-white p-6 text-center shadow-lg">
          <h2 className="text-sm font-medium text-slate-700">Account</h2>
          {status === 'authenticated' ? (
            <>
              <p className="text-slate-600">{user?.name ? `${user.name} (${user.email})` : user?.email}</p>
              <Button variant="ghost" onClick={() => logout()}>
                Log out
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/login" className="font-medium text-accent-purple">
                Log in
              </Link>
              <Link to="/signup" className="font-medium text-accent-purple">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
