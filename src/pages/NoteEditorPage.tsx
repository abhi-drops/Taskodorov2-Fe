import { useParams } from 'react-router'
import { AppShell } from '../components/AppShell'

export default function NoteEditorPage() {
  const { id } = useParams<{ id?: string }>()

  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <h1 className="font-display text-2xl font-bold text-nav-dark">
          {id ? `Edit note ${id}` : 'New note'}
        </h1>
        <p className="text-slate-600">Note create/edit UI lands in phase 2.5.</p>
      </div>
    </AppShell>
  )
}
