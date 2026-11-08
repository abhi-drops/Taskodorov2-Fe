import { SWATCH_CLASSES } from './ui/swatchColors'
import { PRIORITY_COLOR_MAP } from '../lib/notes/resolveNoteColor'
import type { TemplateContent, TemplateGroup, TemplateNote } from '../types/template'

const MAX_COLUMNS = 8
const MAX_BLOCKS = 3

function blockColor(note: TemplateNote, group: TemplateGroup) {
  return group.noteColorMode === 'priority' ? PRIORITY_COLOR_MAP[note.priority] : (note.color ?? 'yellow')
}

/**
 * A tiny picture of a template's board, made of the board's own shapes: one column per
 * group (an ink bar for the group chip) holding a block per sample note in that note's
 * sticky colour. Purely decorative: the template's name always sits beside it.
 */
export function TemplateThumb({
  content,
  size = 'small',
  className = '',
}: {
  content: TemplateContent
  /** `large` for the roomy tiles of the desktop "New workspace" dialog. */
  size?: 'small' | 'large'
  className?: string
}) {
  const groups = content.groups.slice(0, MAX_COLUMNS)
  const large = size === 'large'
  return (
    <div aria-hidden="true" className={`flex border border-edge bg-panel ${large ? 'h-32 gap-2 p-2' : 'h-12 gap-1 p-1'} ${className}`}>
      {groups.map((group) => (
        <div key={group.key} className={`flex min-w-0 flex-1 flex-col ${large ? 'gap-1.5' : 'gap-0.5'}`}>
          <div className={`shrink-0 bg-fg ${large ? 'h-2' : 'h-1'}`} />
          {group.notes.slice(0, MAX_BLOCKS).map((note) => (
            <div key={note.key} className={`shrink-0 ${large ? 'h-6' : 'h-2'} ${SWATCH_CLASSES[blockColor(note, group)]}`} />
          ))}
        </div>
      ))}
    </div>
  )
}
