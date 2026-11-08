interface ProgressBarProps {
  value: number
  showLabel?: boolean
  className?: string
}

export function ProgressBar({ value, showLabel = false, className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-card bg-hairline"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-card bg-accent-purple transition-all" style={{ width: `${clamped}%` }} />
      </div>
      {showLabel && <span className="text-sm font-medium text-body">{clamped}%</span>}
    </div>
  )
}
