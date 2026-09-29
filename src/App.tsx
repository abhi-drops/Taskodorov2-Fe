import { RouterProvider } from 'react-router'
import { router } from './router/routes'
import { AuthProvider } from './lib/auth/AuthContext'
import { WorkspaceProvider } from './lib/workspace/WorkspaceContext'
import { useTapHaptics } from './lib/platform/useTapHaptics'

function App() {
  useTapHaptics()

  return (
    <AuthProvider>
      <WorkspaceProvider>
        <RouterProvider router={router} />
      </WorkspaceProvider>
    </AuthProvider>
  )
}

export default App
