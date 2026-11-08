import { Link } from 'react-router'
import { useLoginForm } from '../common_logics/useLoginForm'
import { AuthCard } from '../components/ui/AuthCard'
import { AppNameHeading } from '../components/ui/AppNameHeading'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { FormError } from '../components/ui/FormError'
import { GoogleSignInButton } from '../components/ui/GoogleSignInButton'
import { usePlatform } from '../lib/platform/usePlatform'
import { LoginScreen as MobileLoginScreen } from '../mobile/screens/LoginScreen'

function WebLoginContent() {
  const { values, fieldErrors, handleChange, handleSubmit, isSubmitting, submitError } =
    useLoginForm()

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface p-6">
      <AuthCard>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <AppNameHeading subtitle="Welcome back" />
          <FormError message={submitError} />
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
            autoComplete="current-password"
          />
          <Button type="submit" loading={isSubmitting}>
            Log in
          </Button>
          <GoogleSignInButton />
          <p className="text-center text-sm text-muted">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-accent-purple">
              Sign up
            </Link>
          </p>
        </form>
      </AuthCard>
    </div>
  )
}

export default function LoginPage() {
  const { isMobile } = usePlatform()
  return isMobile ? <MobileLoginScreen /> : <WebLoginContent />
}
