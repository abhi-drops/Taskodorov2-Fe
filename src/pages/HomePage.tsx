import { Link } from 'react-router'
import { AppShell } from '../components/AppShell'
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher'
import { Icon } from '../components/ui/Icon'
import { Tabs } from '../components/ui/Tabs'
import { usePlatform } from '../lib/platform/usePlatform'
import { useBoard } from '../common_logics/useBoard'
import searchIcon from '../assets/search.png'
import pluseIcon from '../assets/pluse.png'
import type { Group } from '../types/group'

function GroupPanel({ group }: { group: Group }) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-card bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-nav-dark">{group.name}</h2>
        <Link
          to={`/notes/new?group=${group.id}`}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-purple"
          aria-label={`Add note to ${group.name}`}
        >
          <Icon src={pluseIcon} alt="" size={12} className="[filter:brightness(0)_invert(1)]" />
        </Link>
      </div>
      <p className="text-sm text-slate-500">No notes yet.</p>
    </div>
  )
}

export default function HomePage() {
  const { isNative } = usePlatform()
  const { groups, activeGroupId, setActiveGroupId } = useBoard()
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
          {activeGroup && <GroupPanel group={activeGroup} />}
        </div>
      ) : (
        <div className="mt-6 flex flex-1 gap-4 overflow-x-auto">
          {groups.map((group) => (
            <div key={group.id} className="w-64 shrink-0">
              <GroupPanel group={group} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
