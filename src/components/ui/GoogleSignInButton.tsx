import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { useGoogleSignIn } from '../../common_logics/useGoogleSignIn'
import { usePlatform } from '../../lib/platform/usePlatform'
import { GOOGLE_CLIENT_ID_WEB } from '../../lib/google/googleAuthWeb'
import { Button } from './Button'

export function GoogleSignInButton() {
  const { isNative } = usePlatform()
  const { isReady, isSubmitting, handleNativeSignIn, handleWebCredential } = useGoogleSignIn()

  if (!isReady) {
    return (
      <Button variant="secondary" disabled>
        Google Sign-In not configured yet
      </Button>
    )
  }

  if (isNative) {
    return (
      <Button variant="secondary" loading={isSubmitting} onClick={handleNativeSignIn}>
        Continue with Google
      </Button>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID_WEB}>
      <GoogleLogin
        onSuccess={(credential) => {
          if (credential.credential) handleWebCredential(credential.credential)
        }}
      />
    </GoogleOAuthProvider>
  )
}
