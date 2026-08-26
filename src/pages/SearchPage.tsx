import { AppShell } from '../components/AppShell'

export default function SearchPage() {
  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <h1 className="font-display text-2xl font-bold text-nav-dark">Search</h1>
        <p className="text-slate-600">Search &amp; filter lands in phase 2.6.</p>
      </div>
    </AppShell>
  )
}
