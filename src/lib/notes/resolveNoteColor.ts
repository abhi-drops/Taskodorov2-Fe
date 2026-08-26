import type { SwatchColor } from '../../components/ui/swatchColors'
import type { Group } from '../../types/group'
import type { Note, Priority } from '../../types/note'

export const PRIORITY_COLOR_MAP: Record<Priority, SwatchColor> = {
  high: 'coral',
  medium: 'yellow',
  normal: 'blue',
  low: 'green',
}

const DEFAULT_COLOR: SwatchColor = 'yellow'

export function resolveNoteColor(note: Note, group: Group): SwatchColor {
  if (group.noteColorMode === 'priority') {
    return PRIORITY_COLOR_MAP[note.priority]
  }
  return (note.color as SwatchColor | null) ?? DEFAULT_COLOR
}
