import { GoogleOAuthProvider } from '@react-oauth/google'
import { RouterProvider } from 'react-router'
import { router } from './router/routes'
import { AuthProvider } from './lib/auth/AuthContext'
import { SyncProvider } from './lib/sync/SyncContext'
import { WorkspaceProvider } from './lib/workspace/WorkspaceContext'
import { useTapHaptics } from './lib/platform/useTapHaptics'
import { isNative } from './lib/platform/isNative'
import { GOOGLE_CLIENT_ID_WEB, isGoogleWebConfigured } from './lib/google/googleAuthWeb'
import { MobileWebNotice } from './components/MobileWebNotice'
import { SyncStrategyDialog } from './components/SyncStrategyDialog'

function App() {
  useTapHaptics()

  const tree = (
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

  // One app-level provider instead of one per call site (Login/Signup's
  // GoogleSignInButton, Settings' SyncChip) — each separate <GoogleOAuthProvider>
  // re-ran google.accounts.id.initialize() on its own mount, which GIS logs as
  // "called multiple times... only the last initialized instance will be used."
  // Harmless in practice (only one of those ever renders at a time), but pointless
  // console noise avoided by initializing once for the app's lifetime instead.
  // Web only — native never uses this (a different plugin entirely), so skip loading
  // Google's GSI script into the Android WebView at all; `GoogleSignInButton.tsx`'s
  // native branch already doesn't render `<GoogleLogin>`, this just matches that.
  return !isNative() && isGoogleWebConfigured() ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID_WEB}>{tree}</GoogleOAuthProvider>
  ) : (
    tree
  )
}

export default App
