import { Select } from './ui/Select'
import { MAX_HIDE_AFTER } from '../lib/notes/hiddenNotes'
import type { HideAfterMode, HideAfterUnit, NoteColorMode, SortedBy } from '../types/group'

interface GroupSettingsFieldsProps {
  sortedBy: SortedBy
  noteColorMode: NoteColorMode
  /** The id (or template key) of the group checked notes move to, `null` for none. */
  onCheckMoveTo: string | null
  resetOnMove: boolean
  hideAfterMode: HideAfterMode
  hideAfterAmount: number
  hideAfterUnit: HideAfterUnit
  /** The other groups a checked note could move to. */
  siblingGroups: { id: string; name: string }[]
  onSortedByChange: (value: SortedBy) => void
  onNoteColorModeChange: (value: NoteColorMode) => void
  onCheckMoveToChange: (value: string | null) => void
  onResetOnMoveChange: (value: boolean) => void
  onHideAfterModeChange: (value: HideAfterMode) => void
  onHideAfterAmountChange: (value: number) => void
  onHideAfterUnitChange: (value: HideAfterUnit) => void
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
  hideAfterMode,
  hideAfterAmount,
  hideAfterUnit,
  siblingGroups,
  onSortedByChange,
  onNoteColorModeChange,
  onCheckMoveToChange,
  onResetOnMoveChange,
  onHideAfterModeChange,
  onHideAfterAmountChange,
  onHideAfterUnitChange,
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

      <div data-tour="group-on-check">
        <Select
          label="On Check Move To"
          value={onCheckMoveTo ?? 'none'}
          onChange={(value) => onCheckMoveToChange(value === 'none' ? null : value)}
          options={[{ value: 'none', label: 'None' }, ...siblingGroups.map((sg) => ({ value: sg.id, label: sg.name }))]}
        />
      </div>

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

      <div data-tour="group-hide-after">
        <Select
          label="Hide Notes After"
          value={hideAfterMode}
          onChange={onHideAfterModeChange}
          options={[
            { value: 'never', label: 'Never' },
            { value: 'checked', label: 'After checked' },
          ]}
        />
      </div>

      {hideAfterMode === 'checked' && (
        <div className="flex items-end gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-left text-sm font-medium text-body">
            Hide after
            {/* Uncontrolled and committed on blur, like the other typed fields: saving
                per keystroke would write (and sync) every intermediate number. `key`
                re-seeds it after the unit changes clamp the amount. */}
            <input
              key={`${hideAfterUnit}-${hideAfterAmount}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_HIDE_AFTER[hideAfterUnit]}
              defaultValue={hideAfterAmount}
              onBlur={(e) => {
                const parsed = Math.round(Number(e.target.value))
                const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), MAX_HIDE_AFTER[hideAfterUnit]) : hideAfterAmount
                e.target.value = String(next)
                if (next !== hideAfterAmount) onHideAfterAmountChange(next)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="w-full min-w-0 rounded-card border-[3px] border-ink bg-white px-3.5 py-2 font-medium text-ink shadow-card outline-none focus-visible:bg-sticky-yellow"
            />
          </label>
          <Select
            className="min-w-0 flex-1"
            label="Unit"
            value={hideAfterUnit}
            onChange={onHideAfterUnitChange}
            options={[
              { value: 'hours', label: 'Hours' },
              { value: 'days', label: 'Days' },
            ]}
          />
        </div>
      )}
    </>
  )
}
