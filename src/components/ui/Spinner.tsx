interface SpinnerProps {
  size?: number
  fullScreen?: boolean
}

export function Spinner({ size = 24, fullScreen = false }: SpinnerProps) {
  const spinner = (
    <div
      className="animate-spin rounded-full border-2 border-hairline border-t-accent-purple"
      style={{ width: size, height: size }}
    />
  )

  if (!fullScreen) return spinner

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface">
      {spinner}
    </div>
  )
}
