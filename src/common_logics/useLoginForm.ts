import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../lib/auth/useAuth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Field = 'email' | 'password'

export function useLoginForm() {
  const { login, error: authError } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    setFieldErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate(): boolean {
    const errors: Partial<Record<Field, string>> = {}
    if (!values.email) errors.email = 'Email is required'
    else if (!EMAIL_RE.test(values.email)) errors.email = 'Enter a valid email'
    if (!values.password) errors.password = 'Password is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await login(values.email, values.password)
      navigate('/', { replace: true })
    } catch {
      // authError already set by AuthContext
    } finally {
      setIsSubmitting(false)
    }
  }

  return { values, fieldErrors, handleChange, handleSubmit, isSubmitting, submitError: authError }
}
