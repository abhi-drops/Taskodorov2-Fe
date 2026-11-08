import { Link } from 'react-router'
import { useLoginForm } from '../../common_logics/useLoginForm'
import { AppNameHeading } from '../../components/ui/AppNameHeading'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { FormError } from '../../components/ui/FormError'
import { GoogleSignInButton } from '../../components/ui/GoogleSignInButton'

export function LoginScreen() {
  const { values, fieldErrors, handleChange, handleSubmit, isSubmitting, submitError } =
    useLoginForm()

  return (
    <div
      className="flex min-h-svh flex-col justify-center gap-8 bg-surface px-6"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <AppNameHeading subtitle="Welcome back" />
      <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
        <FormError message={submitError} />
        <TextField
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
          className="py-3.5 text-base"
        />
        <TextField
          label="Password"
          type="password"
          value={values.password}
          onChange={(e) => handleChange('password', e.target.value)}
          error={fieldErrors.password}
          autoComplete="current-password"
          className="py-3.5 text-base"
        />
        <Button type="submit" loading={isSubmitting} className="py-3.5 text-base">
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
    </div>
  )
}
