import { Link } from 'react-router'
import { AppShell } from '../components/AppShell'
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher'
import { GroupColumn } from '../components/GroupColumn'
import { Icon } from '../components/ui/Icon'
import { Tabs } from '../components/ui/Tabs'
import { usePlatform } from '../lib/platform/usePlatform'
import { useBoard } from '../common_logics/useBoard'
import searchIcon from '../assets/search.png'

export default function HomePage() {
  const { isNative } = usePlatform()
  const { groups, activeGroupId, setActiveGroupId, notesForGroup, refresh } = useBoard()
  const activeGroup = groups.find((g) => g.id === activeGroupId)

  const workspaceSwitcher = <WorkspaceSwitcher />
  const searchLink = (
    <Link to="/search" aria-label="Search">
      <Icon src={searchIcon} alt="" size={20} />
    </Link>
  )

  return (
    <AppShell
      headerStart={!isNative ? workspaceSwitcher : undefined}
      headerEnd={!isNative ? searchLink : undefined}
      addNoteGroupId={isNative ? activeGroupId : undefined}
    >
      {isNative && (
        <div className="flex items-center justify-between gap-4">
          {workspaceSwitcher}
          {searchLink}
        </div>
      )}

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
            <GroupColumn
              group={activeGroup}
              notes={notesForGroup(activeGroup)}
              onChange={refresh}
              showHeader={false}
            />
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-1 gap-10 overflow-x-auto">
          {groups.map((group) => (
            <div key={group.id} className="w-[22rem] shrink-0 pl-5">
              <GroupColumn group={group} notes={notesForGroup(group)} onChange={refresh} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
