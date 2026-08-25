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

  const isReady = isNative ? isGoogleNativeConfigured() : isGoogleWebConfigured()

  async function handleNativeSignIn() {
    setIsSubmitting(true)
    try {
      const idToken = await signInNative()
      await loginWithGoogle(idToken)
      navigate('/', { replace: true })
    } catch {
      // loginWithGoogle already set AuthContext's error state
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleWebCredential(idToken: string) {
    setIsSubmitting(true)
    try {
      await loginWithGoogle(idToken)
      navigate('/', { replace: true })
    } catch {
      // loginWithGoogle already set AuthContext's error state
    } finally {
      setIsSubmitting(false)
    }
  }

  return { isReady, isSubmitting, handleNativeSignIn, handleWebCredential }
}
