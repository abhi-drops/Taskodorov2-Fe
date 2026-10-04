import type { SelectHTMLAttributes } from 'react'
import { AnimatedIcon } from './AnimatedIcon'
import { ChevronDownIcon } from './icons'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
}

export function Select({ label, error, id, className = '', children, ...rest }: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className={`w-full appearance-none rounded-card border bg-white px-3.5 py-2.5 pr-9 text-slate-900 outline-none focus:ring-2 focus:ring-accent-purple ${
            error ? 'border-sticky-coral' : 'border-slate-200'
          } ${className}`}
          {...rest}
        >
          {children}
        </select>
        <AnimatedIcon
          icon={ChevronDownIcon}
          size={14}
          still
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        />
      </div>
      {error && <span className="text-sm text-sticky-coral">{error}</span>}
    </div>
  )
}
