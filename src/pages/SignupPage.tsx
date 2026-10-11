import { Link } from 'react-router'
import { useSignupForm } from '../common_logics/useSignupForm'
import { AuthCard } from '../components/ui/AuthCard'
import { AppNameHeading } from '../components/ui/AppNameHeading'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { FormError } from '../components/ui/FormError'
import { GoogleSignInButton } from '../components/ui/GoogleSignInButton'
import { usePlatform } from '../lib/platform/usePlatform'
import { SignupScreen as MobileSignupScreen } from '../mobile/screens/SignupScreen'

function WebSignupContent() {
  const { values, fieldErrors, handleChange, handleSubmit, isSubmitting, submitError } =
    useSignupForm()

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface p-6">
      <AuthCard>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <AppNameHeading subtitle="Create your account" />
          <FormError message={submitError} />
          <TextField
            label="Name"
            value={values.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={fieldErrors.name}
            autoComplete="name"
          />
          <TextField
            label="Email"
            type="email"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={fieldErrors.email}
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
          <TextField
            label="Confirm password"
            type="password"
            value={values.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />
          <Button type="submit" loading={isSubmitting}>
            Sign up
          </Button>
          <GoogleSignInButton />
          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent-purple">
              Log in
            </Link>
          </p>
        </form>
      </AuthCard>
    </div>
  )
}

export default function SignupPage() {
  const { isMobile } = usePlatform()
  return isMobile ? <MobileSignupScreen /> : <WebSignupContent />
}
