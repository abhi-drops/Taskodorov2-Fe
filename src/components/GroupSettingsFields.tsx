import { Select } from './ui/Select'
import type { NoteColorMode, SortedBy } from '../types/group'

interface GroupSettingsFieldsProps {
  sortedBy: SortedBy
  noteColorMode: NoteColorMode
  /** The id (or template key) of the group checked notes move to, `null` for none. */
  onCheckMoveTo: string | null
  resetOnMove: boolean
  /** The other groups a checked note could move to. */
  siblingGroups: { id: string; name: string }[]
  onSortedByChange: (value: SortedBy) => void
  onNoteColorModeChange: (value: NoteColorMode) => void
  onCheckMoveToChange: (value: string | null) => void
  onResetOnMoveChange: (value: boolean) => void
}

/**
 * The per-group settings dropdowns. Presentational only (values in, callbacks out), so
 * the same controls edit a live group in Settings and a group inside a template.
 */
export function GroupSettingsFields({
  sortedBy,
  noteColorMode,
  onCheckMoveTo,
  resetOnMove,
  siblingGroups,
  onSortedByChange,
  onNoteColorModeChange,
  onCheckMoveToChange,
  onResetOnMoveChange,
}: GroupSettingsFieldsProps) {
  return (
    <>
      <Select
        label="Sorted By"
        value={sortedBy}
        onChange={onSortedByChange}
        options={[
          { value: 'manual', label: 'Manual' },
          { value: 'alphabetical', label: 'A to Z' },
          { value: 'date', label: 'Date' },
          { value: 'priority', label: 'Priority' },
        ]}
      />

      <Select
        label="On Check Move To"
        value={onCheckMoveTo ?? 'none'}
        onChange={(value) => onCheckMoveToChange(value === 'none' ? null : value)}
        options={[{ value: 'none', label: 'None' }, ...siblingGroups.map((sg) => ({ value: sg.id, label: sg.name }))]}
      />

      {onCheckMoveTo && (
        <Select
          label="Reset To Unchecked On Move"
          value={resetOnMove ? 'on' : 'off'}
          onChange={(value) => onResetOnMoveChange(value === 'on')}
          options={[
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
        />
      )}

      <Select
        label="Note Colors"
        value={noteColorMode}
        onChange={onNoteColorModeChange}
        options={[
          { value: 'manual', label: 'Manual' },
          { value: 'priority', label: 'Priority' },
        ]}
      />
    </>
  )
}
