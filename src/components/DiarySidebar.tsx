import { useState, type ReactNode } from 'react'
import { AnimatedIcon, type AnimatedIconComponent } from './ui/AnimatedIcon'
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  MinusIcon,
  PlusIcon,
  ResetIcon,
  UncheckedIcon,
} from './ui/icons'
import { SWATCH_CLASSES, SWATCH_TEXT_CLASSES, type SwatchColor } from './ui/swatchColors'
import {
  formatTimeOfDay,
  type DayCountsDetailed,
  type FeedEntry,
  type FeedKind,
  type ListChange,
} from '../lib/diary/replay'

/**
 * The Diary day's summary pieces, shared by the desktop sidebar (beside the replay) and
 * the mobile day page (which is *only* this summary, no scrubber).
 */

/**
 * Colour scheme (shared by count tiles, action chips and the calendar chips):
 * violet = created · green = checked / completed · yellow = content updates (counter,
 * rename, color, list, unchecked) · black with yellow text = status · blue = moved ·
 * coral = deleted.
 */
const VIOLET = 'bg-accent-purple text-white'
const GREEN = 'bg-sticky-green text-ink'
const YELLOW = 'bg-sticky-yellow text-ink'
const STATUS = 'bg-ink text-sticky-yellow'

const COUNT_TILES: { key: keyof DayCountsDetailed; label: string; tone: string }[] = [
  { key: 'created', label: 'Created', tone: VIOLET },
  { key: 'moved', label: 'Moved', tone: 'bg-sticky-blue text-ink' },
  { key: 'completed', label: 'Completed', tone: GREEN },
  { key: 'checked', label: 'Checked', tone: GREEN },
  { key: 'unchecked', label: 'Unchecked', tone: YELLOW },
  { key: 'counterChanges', label: 'Counter', tone: YELLOW },
  { key: 'listChanges', label: 'List updates', tone: YELLOW },
  { key: 'titleEdits', label: 'Renamed', tone: YELLOW },
  { key: 'colorChanges', label: 'Color changes', tone: YELLOW },
  { key: 'statuses', label: 'Statuses', tone: STATUS },
  { key: 'statusEdits', label: 'Status edits', tone: STATUS },
  { key: 'statusDeletes', label: 'Statuses deleted', tone: 'bg-sticky-coral text-ink' },
  { key: 'deleted', label: 'Deleted', tone: 'bg-sticky-coral text-ink' },
]

/** Per-action counts as small square tiles. Zero tiles are hidden; Completed only shows when set up. */
export function DiaryCounts({ counts }: { counts: DayCountsDetailed }) {
  const tiles = COUNT_TILES.filter((t) => counts[t.key] > 0)
  if (tiles.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((t) => (
        <div key={t.key} className={`rounded-card border-2 border-ink px-2 py-1.5 shadow-card ${t.tone}`}>
          <div className="font-display text-lg font-bold leading-none">{counts[t.key]}</div>
          <div className="mt-0.5 text-[11px] leading-tight">{t.label}</div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- change list

/** Action chip per kind, in the same colour scheme as the count tiles (see above). */
const KIND_CHIP: Record<FeedKind, { label: string; tone: string; icon?: AnimatedIconComponent }> = {
  created: { label: 'Created', tone: VIOLET },
  moved: { label: 'Moved', tone: 'bg-sticky-blue text-ink' },
  checked: { label: 'Checked', tone: GREEN, icon: CheckIcon },
  unchecked: { label: 'Unchecked', tone: YELLOW, icon: UncheckedIcon },
  counter: { label: 'Counter', tone: YELLOW },
  list: { label: 'List', tone: YELLOW },
  title: { label: 'Renamed', tone: YELLOW },
  color: { label: 'Color', tone: YELLOW },
  status: { label: 'Status', tone: STATUS },
  status_edited: { label: 'Status', tone: STATUS, icon: EditIcon },
  status_deleted: { label: 'Status deleted', tone: 'bg-sticky-coral text-ink' },
  deleted: { label: 'Deleted', tone: 'bg-sticky-coral text-ink' },
}

const isSwatch = (color: string | null | undefined): color is SwatchColor => !!color && color in SWATCH_CLASSES

function Chip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-card border-2 border-ink px-1.5 font-display text-[10px] font-bold uppercase leading-4 ${className}`}
    >
      {children}
    </span>
  )
}

/** A group name as a small grey chip, like the board's column header chips. */
function GroupChip({ name }: { name: string }) {
  return (
    <span className="inline-flex max-w-[45%] items-center truncate rounded-card border-2 border-ink bg-slate-300 px-1.5 text-[11px] font-medium leading-4 text-ink">
      {name}
    </span>
  )
}

function Swatch({ color }: { color: string | null | undefined }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 shrink-0 border-2 border-ink ${isSwatch(color) ? SWATCH_CLASSES[color] : 'bg-neutral-300'}`}
      title={color ?? 'no color'}
    />
  )
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)

/** Icon + wording per item-level list change. */
const LIST_CHANGE: Record<ListChange['change'], { icon: AnimatedIconComponent; className?: string }> = {
  checked: { icon: CheckIcon },
  unchecked: { icon: UncheckedIcon },
  added: { icon: PlusIcon },
  removed: { icon: MinusIcon, className: 'line-through opacity-70' },
  edited: { icon: EditIcon },
}

function ListChanges({ changes }: { changes: ListChange[] }) {
  return (
    <ul className="flex flex-col gap-0.5 text-xs text-ink">
      {changes.map((c, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <AnimatedIcon icon={LIST_CHANGE[c.change].icon} size={12} className="mt-0.5" />
          <span className={`min-w-0 break-words ${LIST_CHANGE[c.change].className ?? ''}`}>
            {c.change === 'edited' ? (
              <>
                <span className="line-through opacity-60">{c.previousText}</span>{' '}
                <AnimatedIcon icon={ArrowRightIcon} size={12} className="align-middle" /> {c.text}
              </>
            ) : (
              c.text
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The visual detail line under the title, specific to each kind of change. */
function EntryDetail({ entry }: { entry: FeedEntry }) {
  switch (entry.kind) {
    case 'created':
      return entry.toGroup ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
          in <GroupChip name={entry.toGroup} />
        </div>
      ) : null
    case 'moved':
      return (
        <div className="flex flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-ink">
            <GroupChip name={entry.fromGroup ?? '?'} />
            <AnimatedIcon icon={ArrowRightIcon} size={12} />
            <GroupChip name={entry.toGroup ?? '?'} />
          </div>
          {entry.resetOnMove && (
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <AnimatedIcon icon={ResetIcon} size={12} />
              reset to unchecked
            </span>
          )}
        </div>
      )
    case 'title':
      return (
        <p className="break-words text-xs text-slate-600">
          was <span className="line-through">{entry.previousTitle || 'Untitled'}</span>
        </p>
      )
    case 'color':
      return (
        <div className="flex items-center gap-1.5 text-xs text-ink">
          <Swatch color={entry.previousColor} />
          <AnimatedIcon icon={ArrowRightIcon} size={12} />
          <Swatch color={entry.color} />
        </div>
      )
    case 'counter': {
      const delta = entry.fromValue != null && entry.toValue !== undefined ? entry.toValue - entry.fromValue : null
      return (
        <div className="flex items-baseline gap-2 text-ink">
          <span className="inline-flex items-center gap-1 font-display text-sm font-bold">
            {entry.fromValue ?? '?'}
            <AnimatedIcon icon={ArrowRightIcon} size={12} />
            {entry.toValue}
          </span>
          {delta !== null && delta !== 0 && <span className="font-display text-xs text-slate-600">{signed(delta)}</span>}
        </div>
      )
    }
    case 'list':
      return <ListChanges changes={entry.listChanges ?? []} />
    case 'status':
    case 'status_edited':
    case 'status_deleted':
      // The same dark strip a note card uses for its statuses, in the note's colour.
      // An edit shows old → new; a deletion shows the removed text struck through.
      return (
        <div
          className={`break-words bg-ink px-2 py-1 text-xs font-medium ${
            isSwatch(entry.color) ? SWATCH_TEXT_CLASSES[entry.color] : 'text-white'
          }`}
        >
          {entry.kind === 'status_edited' && (
            <>
              <span className="line-through opacity-60">{entry.previousStatusText}</span>{' '}
              <AnimatedIcon icon={ArrowRightIcon} size={12} className="align-middle" />{' '}
            </>
          )}
          <span className={entry.kind === 'status_deleted' ? 'line-through opacity-70' : ''}>{entry.statusText}</span>
        </div>
      )
    case 'checked':
    case 'unchecked':
    case 'deleted':
      return null
  }
}

/** A merged counter burst: collapsed by default, expands to every individual tap. */
function TapBreakdown({ entry }: { entry: FeedEntry }) {
  const [open, setOpen] = useState(false)
  const taps = entry.taps ?? []
  return (
    <div className="px-2 pb-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-0.5 font-display text-[11px] font-bold text-slate-600 hover:text-ink"
      >
        <AnimatedIcon icon={open ? ChevronDownIcon : ChevronRightIcon} size={12} />
        {open ? 'Hide taps' : `Show ${taps.length} taps`}
      </button>
      {open && (
        <ol className="mt-1 flex flex-col gap-0.5 border-l-2 border-ink/20 pl-2">
          {taps.map((tap, i) => {
            const previous = i === 0 ? entry.fromValue : taps[i - 1].value
            return (
              <li key={i} className="flex items-baseline gap-2 text-xs text-ink">
                <span className="w-16 shrink-0 font-display text-[11px] text-slate-600">{formatTimeOfDay(tap.time)}</span>
                <span className="font-display font-bold">{tap.value}</span>
                {previous != null && <span className="font-display text-[11px] text-slate-600">{signed(tap.value - previous)}</span>}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

interface DiaryFeedListProps {
  feed: FeedEntry[]
  /** Desktop: the scrubber's frame. Entries after it are dimmed and the current one is highlighted. */
  frame?: number
  onSelect?: (entry: FeedEntry) => void
  empty?: string
}

/**
 * The day's changes. Each one has an action chip and the time, the note's title in bold,
 * then a visual detail: group chips for a move, before → after swatches for a colour
 * change, the old title for a rename, the status in a dark strip, a counter's
 * before → after, a list's item-level changes. A merged counter burst can expand to show
 * each tap. Each entry's `text` is its plain-sentence version, used as the accessible
 * name.
 */
export function DiaryFeedList({ feed, frame, onSelect, empty = 'Nothing happened on this day.' }: DiaryFeedListProps) {
  if (feed.length === 0) return <p className="text-sm text-slate-500">{empty}</p>
  return (
    <ol className="flex flex-col gap-2">
      {feed.map((entry) => {
        const isCurrent = frame !== undefined && entry.frame === frame
        const isFuture = frame !== undefined && entry.frame > frame
        const chip = KIND_CHIP[entry.kind]
        return (
          <li
            key={`${entry.frame}-${entry.noteId}`}
            className={`rounded-card border-2 transition ${
              isCurrent ? 'border-ink bg-sticky-yellow shadow-card' : 'border-ink/15 bg-white hover:border-ink/40'
            } ${isFuture ? 'opacity-45' : ''}`}
          >
            <button
              type="button"
              onClick={() => onSelect?.(entry)}
              aria-label={`${entry.text}, ${formatTimeOfDay(entry.time)}`}
              className="flex w-full flex-col gap-1.5 p-2 text-left"
            >
              <span className="flex items-center gap-1.5">
                <Chip className={chip.tone}>
                  {chip.icon && <AnimatedIcon icon={chip.icon} size={10} />}
                  {chip.label}
                </Chip>
                {entry.completed && (
                  <Chip className={GREEN}>
                    <AnimatedIcon icon={CheckIcon} size={10} />
                    Completed
                  </Chip>
                )}
                <span className="ml-auto shrink-0 font-display text-[11px] text-slate-600">
                  {formatTimeOfDay(entry.time)}
                </span>
              </span>
              <span
                className={`break-words text-sm font-bold text-ink ${
                  entry.kind === 'deleted' ? 'line-through opacity-70' : ''
                }`}
              >
                {entry.title || 'Untitled'}
              </span>
              <EntryDetail entry={entry} />
            </button>
            {entry.kind === 'counter' && (entry.taps?.length ?? 0) > 1 && <TapBreakdown entry={entry} />}
          </li>
        )
      })}
    </ol>
  )
}
