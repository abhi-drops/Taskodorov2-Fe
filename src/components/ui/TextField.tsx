import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function TextField({ label, error, id, className = '', ...rest }: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={inputId} className="text-sm font-medium text-body">
        {label}
      </label>
      <input
        id={inputId}
        className={`rounded-card border bg-field px-3.5 py-2.5 text-slate-900 outline-none dark:text-fg focus:ring-2 focus:ring-accent-purple ${
          error ? 'border-sticky-coral' : 'border-hairline'
        } ${className}`}
        {...rest}
      />
      {error && <span className="text-sm text-sticky-coral">{error}</span>}
    </div>
  )
}
