interface AppNameHeadingProps {
  subtitle?: string
}

export function AppNameHeading({ subtitle }: AppNameHeadingProps) {
  return (
    <div className="flex flex-col gap-1 text-center">
      <h1 className="font-display text-2xl font-bold text-fg">Taskodoro</h1>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </div>
  )
}
