import { Navigate, Outlet } from 'react-router'
import { useAuth } from './useAuth'
import { Spinner } from '../../components/ui/Spinner'

export function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'hydrating') return <Spinner fullScreen />
  if (status !== 'authenticated') return <Navigate to="/login" replace />

  return <Outlet />
}
