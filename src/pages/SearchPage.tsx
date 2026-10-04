import { AppShell } from '../components/AppShell'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { ChevronDownIcon } from '../components/ui/icons'
import { Icon } from '../components/ui/Icon'
import { Tabs } from '../components/ui/Tabs'
import { BasicNoteCard } from '../components/ui/BasicNoteCard'
import { CounterNoteCard } from '../components/ui/CounterNoteCard'
import { ListNoteCard } from '../components/ui/ListNoteCard'
import { SWATCH_CLASSES, SWATCH_OPTIONS } from '../components/ui/swatchColors'
import { useSearchFilter } from '../common_logics/useSearchFilter'
import type { PriorityFilter, StatusFilter } from '../common_logics/useSearchFilter'
import searchIcon from '../assets/search.png'

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'Completed', value: 'completed' },
  { label: 'Incomplete', value: 'incomplete' },
]

const PRIORITY_OPTIONS: { label: string; value: PriorityFilter }[] = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

function chipClass(active: boolean) {
  return `rounded-card px-3.5 py-1.5 text-sm font-medium transition ${
    active ? 'bg-nav-dark text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`
}

export default function SearchPage() {
  const {
    groups,
    searchText,
    setSearchText,
    selectedGroupId,
    setSelectedGroupId,
    filtersExpanded,
    setFiltersExpanded,
    statusFilter,
    toggleStatus,
    priorityFilter,
    togglePriority,
    colorFilter,
    toggleColor,
    results,
    groupsById,
    refresh,
  } = useSearchFilter()

  const groupTabOptions = [{ label: 'All', value: 'all' }, ...groups.map((g) => ({ label: g.name, value: g.id }))]

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 lg:max-w-6xl">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="search ...."
              className="w-full rounded-card border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-slate-900 outline-none focus:ring-2 focus:ring-accent-purple"
            />
            <Icon
              src={searchIcon}
              alt=""
              size={18}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center gap-1.5 self-start text-sm font-medium text-slate-700"
          >
            Filter
            <AnimatedIcon
              icon={ChevronDownIcon}
              size={14}
              className={`transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {filtersExpanded && (
            <div className="flex flex-col gap-4 rounded-card bg-white p-4 shadow-card">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleStatus(option.value)}
                      className={chipClass(statusFilter.has(option.value))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Priority</p>
                <div className="flex flex-wrap gap-2">
                  {PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => togglePriority(option.value)}
                      className={chipClass(priorityFilter.has(option.value))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Color</p>
                <div className="flex items-center gap-3">
                  {SWATCH_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={color}
                      onClick={() => toggleColor(color)}
                      className={`h-8 w-8 rounded-full transition ${SWATCH_CLASSES[color]} ${
                        colorFilter.has(color) ? 'ring-2 ring-nav-dark ring-offset-2' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <Tabs options={groupTabOptions} value={selectedGroupId} onChange={setSelectedGroupId} />
        </div>

        <div className="flex flex-col gap-3 md:block md:columns-2 lg:columns-3 lg:gap-4">
          {results.length === 0 && <p className="text-sm text-slate-500">No notes match.</p>}
          {results.map((note) => {
            const group = groupsById.get(note.groupId)
            if (!group) return null
            const card =
              note.type === 'counter' ? (
                <CounterNoteCard note={note} group={group} onChange={refresh} />
              ) : note.type === 'list' ? (
                <ListNoteCard note={note} group={group} onChange={refresh} />
              ) : (
                <BasicNoteCard note={note} group={group} onChange={refresh} />
              )
            return (
              <div key={note.id} className="md:mb-4 md:break-inside-avoid">
                {card}
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
