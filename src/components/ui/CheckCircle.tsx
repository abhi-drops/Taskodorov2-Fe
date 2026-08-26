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
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon src={checkCircleIcon} alt="" size={size} />
      {checked && (
        <Icon
          src={checkTickIcon}
          alt=""
          size={size * 0.55}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        />
      )}
      <span className="sr-only">{checked ? 'Completed' : 'Not completed'}</span>
    </button>
  )
}
