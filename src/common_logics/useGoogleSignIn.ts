import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../lib/auth/useAuth'
import { usePlatform } from '../lib/platform/usePlatform'
import { isGoogleWebConfigured } from '../lib/google/googleAuthWeb'
import { isGoogleNativeConfigured, signIn as signInNative } from '../lib/google/googleAuthNative'

/**
 * @param redirectTo Where to navigate after a successful sign-in. Defaults to `/`
 *   (the Login/Signup pages' behavior). Pass `null` to stay put — used from Settings'
 *   "Sync With Google" chip, where connecting Google shouldn't bounce the user off
 *   the page they tapped it from.
 */
export function useGoogleSignIn(redirectTo: string | null = '/') {
  const { loginWithGoogle } = useAuth()
  const { isNative } = usePlatform()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReady = isNative ? isGoogleNativeConfigured() : isGoogleWebConfigured()

  async function handleNativeSignIn() {
    setIsSubmitting(true)
    setError(null)
    try {
      const idToken = await signInNative()
      await loginWithGoogle(idToken)
      if (redirectTo !== null) navigate(redirectTo, { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleWebCredential(idToken: string) {
    setIsSubmitting(true)
    setError(null)
    try {
      await loginWithGoogle(idToken)
      if (redirectTo !== null) navigate(redirectTo, { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return { isReady, isSubmitting, error, handleNativeSignIn, handleWebCredential }
}
