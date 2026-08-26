import { useParams } from 'react-router'
import { AppShell } from '../components/AppShell'

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>()

  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <h1 className="font-display text-2xl font-bold text-nav-dark">Group settings</h1>
        <p className="text-slate-600">
          Group {groupId} settings land in phase 2.4 (Sorted By / Note Colors / Delete Group).
        </p>
      </div>
    </AppShell>
  )
}
