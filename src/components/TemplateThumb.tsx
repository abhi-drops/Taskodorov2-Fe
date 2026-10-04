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
export function TemplateThumb({ content, className = '' }: { content: TemplateContent; className?: string }) {
  const groups = content.groups.slice(0, MAX_COLUMNS)
  return (
    <div aria-hidden="true" className={`flex h-12 gap-1 border border-neutral-300 bg-surface p-1 ${className}`}>
      {groups.map((group) => (
        <div key={group.key} className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="h-1 shrink-0 bg-ink" />
          {group.notes.slice(0, MAX_BLOCKS).map((note) => (
            <div key={note.key} className={`h-2 shrink-0 ${SWATCH_CLASSES[blockColor(note, group)]}`} />
          ))}
        </div>
      ))}
    </div>
  )
}
