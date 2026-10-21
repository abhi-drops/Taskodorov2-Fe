import { RouterProvider } from 'react-router'
import { router } from './router/routes'
import { AuthProvider } from './lib/auth/AuthContext'
import { SyncProvider } from './lib/sync/SyncContext'
import { WorkspaceProvider } from './lib/workspace/WorkspaceContext'
import { useTapHaptics } from './lib/platform/useTapHaptics'
import { MobileWebNotice } from './components/MobileWebNotice'
import { SyncStrategyDialog } from './components/SyncStrategyDialog'

function App() {
  useTapHaptics()

  return (
    <AuthProvider>
      <SyncProvider>
        <WorkspaceProvider>
          <RouterProvider router={router} />
          <MobileWebNotice />
          <SyncStrategyDialog />
        </WorkspaceProvider>
      </SyncProvider>
    </AuthProvider>
  )
}

export default App
