import { Icon } from './Icon'
import checkCircleIcon from '../../assets/check-circle.png'
import checkTickIcon from '../../assets/check-tick.png'

interface CheckCircleProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  size?: number
  disabled?: boolean
  className?: string
}

export function CheckCircle({ checked, onChange, size = 24, disabled = false, className = '' }: CheckCircleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-tour="check"
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ width: size, height: size, marginLeft: size * 0.909 }}
    >
      <Icon src={checkCircleIcon} alt="" size={size} />
      {checked && (
        <Icon
          src={checkTickIcon}
          alt=""
          size={size * 1.4}
          className="absolute max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: size * 0.764, top: size * 0.4 }}
        />
      )}
      <span className="sr-only">{checked ? 'Completed' : 'Not completed'}</span>
    </button>
  )
}
