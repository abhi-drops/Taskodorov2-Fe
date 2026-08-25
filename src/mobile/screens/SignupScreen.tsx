import { Link } from 'react-router'
import { useSignupForm } from '../../common_logics/useSignupForm'
import { AppNameHeading } from '../../components/ui/AppNameHeading'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { FormError } from '../../components/ui/FormError'
import { GoogleSignInButton } from '../../components/ui/GoogleSignInButton'

export function SignupScreen() {
  const { values, fieldErrors, handleChange, handleSubmit, isSubmitting, submitError } =
    useSignupForm()

  return (
    <div
      className="flex min-h-svh flex-col justify-center gap-8 bg-surface px-6"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <AppNameHeading subtitle="Create your account" />
      <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
        <FormError message={submitError} />
        <TextField
          label="Name"
          value={values.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={fieldErrors.name}
          autoComplete="name"
          className="py-3.5 text-base"
        />
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
          autoComplete="new-password"
          className="py-3.5 text-base"
        />
        <TextField
          label="Confirm password"
          type="password"
          value={values.confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
          className="py-3.5 text-base"
        />
        <Button type="submit" loading={isSubmitting} className="py-3.5 text-base">
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
    </div>
  )
}
