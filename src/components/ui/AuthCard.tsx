import type { ReactNode } from 'react'

interface AuthCardProps {
  children: ReactNode
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="w-full max-w-sm rounded-card bg-paper p-8 shadow-lg">
      {children}
    </div>
  )
}
