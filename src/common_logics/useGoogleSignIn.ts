import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../lib/auth/useAuth'
import { usePlatform } from '../lib/platform/usePlatform'
import { isGoogleWebConfigured } from '../lib/google/googleAuthWeb'
import { isGoogleNativeConfigured, signIn as signInNative } from '../lib/google/googleAuthNative'

export function useGoogleSignIn() {
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
      navigate('/', { replace: true })
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
      navigate('/', { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return { isReady, isSubmitting, error, handleNativeSignIn, handleWebCredential }
}
