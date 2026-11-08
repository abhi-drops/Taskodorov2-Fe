import { useId } from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import { AnimatedIcon } from './AnimatedIcon'
import { CheckIcon, ChevronDownIcon } from './icons'
import { usePlatform } from '../../lib/platform/usePlatform'

export interface SelectOption<T extends string = string> {
  /** Never an empty string (Radix reserves it for "no value"); use e.g. `'none'`. */
  value: T
  label: string
}

interface SelectProps<T extends string> {
  label: string
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  error?: string
  disabled?: boolean
  className?: string
}

/**
 * Labeled dropdown on Radix Select (headless: keyboard, typeahead, focus and screen-reader
 * behaviour come from Radix; every pixel is ours). Both the trigger and the menu are the
 * board's chip shape: square, `border-[3px] border-ink`, hard `shadow-card`. The
 * highlighted option is `sticky-yellow`; the chosen one is bold with a check.
 *
 * On Android it is a native `<select>` instead, so the option list is the system picker
 * people expect on a phone. The closed control keeps the same chip look.
 */
export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  error,
  disabled,
  className = '',
}: SelectProps<T>) {
  const labelId = useId()
  const { isMobile } = usePlatform()
  const trigger = `w-full rounded-card border-[3px] bg-white px-3.5 py-2 text-left font-medium text-ink shadow-card outline-none focus-visible:bg-sticky-yellow disabled:cursor-not-allowed disabled:opacity-50 ${
    error ? 'border-sticky-coral' : 'border-ink'
  }`

  if (isMobile) {
    return (
      <div className={`flex flex-col gap-1.5 text-left ${className}`}>
        <label htmlFor={labelId} className="text-sm font-medium text-body">
          {label}
        </label>
        <div className="relative">
          <select
            id={labelId}
            value={value}
            onChange={(e) => onChange(e.target.value as T)}
            disabled={disabled}
            className={`appearance-none pr-9 ${trigger}`}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <AnimatedIcon
            icon={ChevronDownIcon}
            size={16}
            still
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink"
          />
        </div>
        {error && <span className="text-sm text-sticky-coral">{error}</span>}
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1.5 text-left ${className}`}>
      <span id={labelId} className="text-sm font-medium text-body">
        {label}
      </span>
      <RadixSelect.Root value={value} onValueChange={(next) => onChange(next as T)} disabled={disabled}>
        <RadixSelect.Trigger
          aria-labelledby={labelId}
          className={`flex items-center justify-between gap-2 data-[state=open]:bg-sticky-yellow ${trigger}`}
        >
          <span className="min-w-0 truncate">
            <RadixSelect.Value />
          </span>
          <AnimatedIcon icon={ChevronDownIcon} size={16} />
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-[70] max-h-[var(--radix-select-content-available-height)] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-card border-[3px] border-ink bg-white shadow-card"
          >
            <RadixSelect.Viewport>
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-pointer select-none items-center justify-between gap-2 px-3.5 py-2 text-ink outline-none data-[highlighted]:bg-sticky-yellow data-[state=checked]:font-bold"
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <AnimatedIcon icon={CheckIcon} size={16} still />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && <span className="text-sm text-sticky-coral">{error}</span>}
    </div>
  )
}
