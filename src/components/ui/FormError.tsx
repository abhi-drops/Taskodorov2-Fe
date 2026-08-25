interface FormErrorProps {
  message: string | null
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null

  return (
    <div className="rounded-card bg-sticky-coral/15 px-3.5 py-2.5 text-sm text-sticky-coral">
      {message}
    </div>
  )
}
