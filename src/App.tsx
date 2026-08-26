import { RouterProvider } from 'react-router'
import { router } from './router/routes'
import { AuthProvider } from './lib/auth/AuthContext'
import { WorkspaceProvider } from './lib/workspace/WorkspaceContext'

function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <RouterProvider router={router} />
      </WorkspaceProvider>
    </AuthProvider>
  )
}

export default App
