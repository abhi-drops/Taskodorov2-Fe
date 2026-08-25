import { RouterProvider } from 'react-router'
import { router } from './router/routes'
import { AuthProvider } from './lib/auth/AuthContext'

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
