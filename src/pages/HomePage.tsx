import { Link } from 'react-router'
import { AppShell } from '../components/AppShell'
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher'
import { Icon } from '../components/ui/Icon'
import { Tabs } from '../components/ui/Tabs'
import { ProgressBar } from '../components/ui/ProgressBar'
import { BasicNoteCard } from '../components/ui/BasicNoteCard'
import { CounterNoteCard } from '../components/ui/CounterNoteCard'
import { ListNoteCard } from '../components/ui/ListNoteCard'
import { usePlatform } from '../lib/platform/usePlatform'
import { useBoard } from '../common_logics/useBoard'
import searchIcon from '../assets/search.png'
import pluseIcon from '../assets/pluse.png'
import type { Group } from '../types/group'
import type { Note } from '../types/note'

function GroupPanel({
  group,
  notes,
  onChange,
}: {
  group: Group
  notes: Note[]
  onChange: () => void
}) {
  const completedCount = notes.filter((n) => n.completed).length
  const progress = notes.length === 0 ? 0 : Math.round((completedCount / notes.length) * 100)

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between rounded-card bg-white px-4 py-2 shadow-lg">
        <h2 className="font-medium text-nav-dark">{group.name}</h2>
        <Link
          to={`/notes/new?group=${group.id}`}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-purple"
          aria-label={`Add note to ${group.name}`}
        >
          <Icon src={pluseIcon} alt="" size={12} className="[filter:brightness(0)_invert(1)]" />
        </Link>
      </div>

      {notes.length > 0 && <ProgressBar value={progress} showLabel className="px-1" />}

      {notes.length === 0 ? (
        <p className="px-1 text-sm text-slate-500">No notes yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => {
            if (note.type === 'counter') {
              return <CounterNoteCard key={note.id} note={note} group={group} onChange={onChange} />
            }
            if (note.type === 'list') {
              return <ListNoteCard key={note.id} note={note} group={group} onChange={onChange} />
            }
            return <BasicNoteCard key={note.id} note={note} group={group} onChange={onChange} />
          })}
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const { isNative } = usePlatform()
  const { groups, activeGroupId, setActiveGroupId, notesForGroup, refresh } = useBoard()
  const activeGroup = groups.find((g) => g.id === activeGroupId)

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-4">
        <WorkspaceSwitcher />
        <Link to="/search" aria-label="Search">
          <Icon src={searchIcon} alt="" size={20} />
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-slate-600">No groups yet — add one from Power Tools.</p>
          <Link to="/power-tools" className="font-medium text-accent-purple">
            Go to Power Tools
          </Link>
        </div>
      ) : isNative ? (
        <div className="mt-6 flex flex-1 flex-col gap-4">
          <Tabs
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
            value={activeGroupId ?? ''}
            onChange={setActiveGroupId}
          />
          {activeGroup && (
            <GroupPanel group={activeGroup} notes={notesForGroup(activeGroup)} onChange={refresh} />
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-1 gap-4 overflow-x-auto">
          {groups.map((group) => (
            <div key={group.id} className="w-64 shrink-0">
              <GroupPanel group={group} notes={notesForGroup(group)} onChange={refresh} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
