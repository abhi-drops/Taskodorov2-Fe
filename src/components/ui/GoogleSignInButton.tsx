import { GoogleLogin } from '@react-oauth/google'
import { useGoogleSignIn } from '../../common_logics/useGoogleSignIn'
import { usePlatform } from '../../lib/platform/usePlatform'
import { Button } from './Button'
import { FormError } from './FormError'

export function GoogleSignInButton() {
  const { isNative } = usePlatform()
  const { isReady, isSubmitting, error, handleNativeSignIn, handleWebCredential } = useGoogleSignIn()

  if (!isReady) {
    return (
      <Button variant="secondary" disabled>
        Google Sign-In not configured yet
      </Button>
    )
  }

  if (isNative) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="secondary" loading={isSubmitting} onClick={handleNativeSignIn}>
          Continue with Google
        </Button>
        <FormError message={error} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <GoogleLogin
        onSuccess={(credential) => {
          if (credential.credential) handleWebCredential(credential.credential)
        }}
      />
      <FormError message={error} />
    </div>
  )
}
