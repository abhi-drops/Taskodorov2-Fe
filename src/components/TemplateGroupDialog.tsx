import { Modal } from './ui/Modal'
import { AnimatedIcon } from './ui/AnimatedIcon'
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon } from './ui/icons'
import { DIALOG_OVERLAY, DIALOG_SHADOW, FIELD_INPUT, FIELD_LABEL } from './ui/dialogStyles'
import { DANGER_CHIP } from './SidebarPanelLayout'
import { TOOLBAR_BUTTON } from './TemplatesShell'
import { GroupSettingsFields } from './GroupSettingsFields'
import { usePlatform } from '../lib/platform/usePlatform'
import type { TemplateContent, TemplateGroup } from '../types/template'

interface TemplateGroupDialogProps {
  content: TemplateContent
  group: TemplateGroup
  onClose: () => void
  onPatch: (patch: Partial<Omit<TemplateGroup, 'key' | 'notes'>>) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}

/**
 * One template group's settings: its name, its place on the board, the same dropdowns as
 * Settings' Group Settings page, and delete. Changes apply as they are made.
 */
export function TemplateGroupDialog({ content, group, onClose, onPatch, onMove, onDelete }: TemplateGroupDialogProps) {
  const { isNative } = usePlatform()
  const index = content.groups.findIndex((g) => g.key === group.key)
  const siblings = content.groups.filter((g) => g.key !== group.key).map((g) => ({ id: g.key, name: g.name }))

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Group settings"
      variant={isNative ? 'bottom-sheet' : 'center'}
      overlayClassName={DIALOG_OVERLAY}
      panelClassName={DIALOG_SHADOW}
    >
      {/* p-1: room for the chips' offset shadows inside Modal's scroll box. */}
      <div className="flex flex-col gap-5 p-1 text-left">
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Name</span>
          <input
            key={group.key}
            defaultValue={group.name}
            onBlur={(e) => {
              const trimmed = e.target.value.trim()
              if (!trimmed) e.target.value = group.name
              else if (trimmed !== group.name) onPatch({ name: trimmed })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className={FIELD_INPUT}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Position on the board</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={index <= 0}
              className={`${TOOLBAR_BUTTON} bg-white hover:bg-slate-50`}
            >
              <AnimatedIcon icon={ChevronLeftIcon} size={16} />
              Move left
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={index >= content.groups.length - 1}
              className={`${TOOLBAR_BUTTON} bg-white hover:bg-slate-50`}
            >
              Move right
              <AnimatedIcon icon={ChevronRightIcon} size={16} />
            </button>
          </div>
        </div>

        <GroupSettingsFields
          sortedBy={group.sortedBy}
          noteColorMode={group.noteColorMode}
          onCheckMoveTo={group.onCheckMoveToKey}
          resetOnMove={group.resetOnMove}
          siblingGroups={siblings}
          onSortedByChange={(sortedBy) => onPatch({ sortedBy })}
          onNoteColorModeChange={(noteColorMode) => onPatch({ noteColorMode })}
          onCheckMoveToChange={(onCheckMoveToKey) => onPatch({ onCheckMoveToKey })}
          onResetOnMoveChange={(resetOnMove) => onPatch({ resetOnMove })}
        />

        <button type="button" onClick={onDelete} className={DANGER_CHIP}>
          <AnimatedIcon icon={TrashIcon} size={16} />
          Delete This Group
        </button>
      </div>
    </Modal>
  )
}
