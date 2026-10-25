interface TabOption {
  label: string
  value: string
}

interface TabsProps {
  options: TabOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ options, value, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="tablist">
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`rounded-card px-3.5 py-1.5 text-sm font-medium transition ${
              // `ink`, the one dark token the whole app uses now (style-guide.md) —
              // `nav-dark` was retired 2026-10-25, it read as near-black everywhere
              // it hid.
              isActive
                ? 'bg-ink text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
