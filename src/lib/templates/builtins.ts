import type { SwatchColor } from '../../components/ui/swatchColors'
import type { HideAfterUnit, NoteColorMode, SortedBy } from '../../types/group'
import type { Priority } from '../../types/note'
import type { TemplateContent, TemplateGroup, TemplateNote } from '../../types/template'

/**
 * The templates the app ships with. Their order here is their order in the Templates
 * app and in the new-workspace picker, which shows the first three by default.
 *
 * These constants are the "factory" versions. The copies in the `templates` table are
 * what the user sees and may edit; "Reset to default" writes a constant back over its
 * copy. Keys only need to be unique within one template.
 */

function basic(
  key: string,
  title: string,
  color: SwatchColor,
  extra: { description?: string; priority?: Priority } = {},
): TemplateNote {
  return {
    key,
    type: 'basic',
    title,
    description: extra.description ?? null,
    color,
    priority: extra.priority ?? 'normal',
    counterStep: 1,
    counterTarget: null,
    listItems: [],
  }
}

function list(key: string, title: string, color: SwatchColor, items: string[], priority: Priority = 'normal'): TemplateNote {
  return { ...basic(key, title, color, { priority }), type: 'list', listItems: items }
}

function counter(key: string, title: string, color: SwatchColor, target: number | null, step = 1): TemplateNote {
  return { ...basic(key, title, color), type: 'counter', counterStep: step, counterTarget: target }
}

function group(
  key: string,
  name: string,
  notes: TemplateNote[] = [],
  settings: {
    moveTo?: string
    resetOnMove?: boolean
    sortedBy?: SortedBy
    noteColorMode?: NoteColorMode
    /** Hide a note this long after it is checked (Group Settings' "Hide Notes After"). */
    hideAfter?: { amount: number; unit: HideAfterUnit }
  } = {},
): TemplateGroup {
  return {
    key,
    name,
    sortedBy: settings.sortedBy ?? 'manual',
    noteColorMode: settings.noteColorMode ?? 'manual',
    onCheckMoveToKey: settings.moveTo ?? null,
    resetOnMove: settings.resetOnMove ?? true,
    hideAfterMode: settings.hideAfter ? 'checked' : 'never',
    hideAfterAmount: settings.hideAfter?.amount ?? 1,
    hideAfterUnit: settings.hideAfter?.unit ?? 'days',
    notes,
  }
}

/**
 * The board every new install starts with. Chained "On Check Move To": checking a Todo
 * item just means "move it along", so it resets to unchecked on arrival in In Progress;
 * checking an In Progress item means it's actually done, so it keeps its checked state
 * on arrival in Completed. The notes walk a new user through that chain.
 */
export const DEFAULT_TEMPLATE_CONTENT: TemplateContent = {
  groups: [
    group(
      'todo',
      'Todo',
      [
        basic('n1', 'Click to edit me', 'yellow', { description: 'Edit Title , Note Type & color ' }),
        basic(
          'n2',
          'Plz check me to go "in progress", then check again to go to "complete" or you can also try drag and drop',
          'coral',
        ),
        basic('n3', 'Try "Settings" for advanced behaviour edits', 'green'),
      ],
      { moveTo: 'in-progress' },
    ),
    group('in-progress', 'In Progress', [], { moveTo: 'completed', resetOnMove: false }),
    group(
      'completed',
      'Completed',
      [basic('n4', 'See Apps → Diary for the full list of changes you\'ve made', 'blue')],
      { hideAfter: { amount: 7, unit: 'days' } },
    ),
  ],
  completedGroupKey: 'completed',
}

const SHOPPING_LIST: TemplateContent = {
  groups: [
    group(
      'to-buy',
      'To buy',
      [
        list('n1', 'Groceries', 'green', ['Milk', 'Eggs', 'Bread', 'Fruit']),
        counter('n2', 'Water bottles', 'blue', 6),
        basic('n3', 'Check for coupons before paying', 'yellow'),
      ],
      // Straight to Bought, still checked: there is no step in between.
      { moveTo: 'bought', resetOnMove: false },
    ),
    group('bought', 'Bought', [], { hideAfter: { amount: 7, unit: 'days' } }),
  ],
  completedGroupKey: 'bought',
}

const BRAINSTORM: TemplateContent = {
  groups: [
    group('ideas', 'Ideas', [
      basic('n1', 'Write every idea down, even the odd ones', 'yellow'),
      basic('n2', 'One idea per note', 'blue'),
      basic('n3', 'Drag the promising ones to Shortlist', 'green'),
    ]),
    group('shortlist', 'Shortlist'),
    group('doing', 'Done', [], { hideAfter: { amount: 14, unit: 'days' } }),
    group('parked', 'Parked', [basic('n4', 'Ideas that can wait live here', 'coral')]),
  ],
  // "Done" is a finished idea now, not one in progress — wire it as the Completed
  // group like every other built-in's terminal group, so moving a note here logs it
  // as Completed in the Diary.
  completedGroupKey: 'doing',
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const WEEKLY_PLANNER: TemplateContent = {
  groups: [
    ...WEEK_DAYS.map((day) => {
      const key = day.toLowerCase()
      const notes =
        day === 'Monday'
          ? [
              list('n1', 'Plan the week', 'yellow', ['Review last week', 'Pick three priorities']),
              basic('n2', 'Check a note to send it to Done', 'blue'),
            ]
          : day === 'Friday'
            ? [basic('n3', 'Weekly review', 'green')]
            : day === 'Sunday'
              ? [basic('n4', 'Rest', 'coral')]
              : []
      return group(key, day, notes, { moveTo: 'done', resetOnMove: false })
    }),
    group('done', 'Done', [], { hideAfter: { amount: 7, unit: 'days' } }),
  ],
  completedGroupKey: 'done',
}

const PROJECT_KANBAN: TemplateContent = {
  groups: [
    group(
      'backlog',
      'Backlog',
      [
        basic('n1', 'Fix the bug blocking release', 'coral', { priority: 'high' }),
        list('n2', 'Launch checklist', 'yellow', ['Write release notes', 'Test on a real device', 'Ship'], 'medium'),
        basic('n3', 'Nice to have: tidy the docs', 'green', { priority: 'low' }),
      ],
      { moveTo: 'in-progress', sortedBy: 'priority', noteColorMode: 'priority' },
    ),
    group('in-progress', 'In progress', [], { moveTo: 'review', noteColorMode: 'priority' }),
    group('review', 'Review', [], { moveTo: 'done', resetOnMove: false, noteColorMode: 'priority' }),
    group('done', 'Done', [], { noteColorMode: 'priority', hideAfter: { amount: 30, unit: 'days' } }),
  ],
  completedGroupKey: 'done',
}

const STUDY_PLAN: TemplateContent = {
  groups: [
    group(
      'to-study',
      'To study',
      [
        list('n1', 'Chapter 1', 'blue', ['Read the chapter', 'Make notes', 'Solve the exercises']),
        counter('n2', 'Practice papers', 'yellow', 10),
      ],
      { moveTo: 'revising' },
    ),
    group('revising', 'Revising', [basic('n3', 'Check a topic again to mark it mastered', 'green')], {
      moveTo: 'mastered',
      resetOnMove: false,
    }),
    group('mastered', 'Mastered', [], { hideAfter: { amount: 21, unit: 'days' } }),
  ],
  completedGroupKey: 'mastered',
}

export interface BuiltinTemplate {
  builtinId: string
  name: string
  content: TemplateContent
}

export const DEFAULT_BUILTIN_ID = 'default'

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  { builtinId: DEFAULT_BUILTIN_ID, name: 'Default', content: DEFAULT_TEMPLATE_CONTENT },
  { builtinId: 'shopping-list', name: 'Shopping list', content: SHOPPING_LIST },
  { builtinId: 'brainstorm', name: 'Brainstorm', content: BRAINSTORM },
  { builtinId: 'weekly-planner', name: 'Weekly planner', content: WEEKLY_PLANNER },
  { builtinId: 'project-kanban', name: 'Project kanban', content: PROJECT_KANBAN },
  { builtinId: 'study-plan', name: 'Study plan', content: STUDY_PLAN },
]
