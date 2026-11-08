import { BOARD_TOUR_SEEN_KEY } from '../db/userStateSchema'

/**
 * The board tour, the first-visit feature tours and the milestone tips, as data.
 * `OnboardingHost` runs them, `TourOverlay` draws them. A step points at an element by a
 * CSS selector over `data-tour` attributes (no selector = a centred card); a step whose
 * element never shows up is skipped, never fatal, because a Google sign-in can replace the
 * default board and the layouts differ between desktop and mobile.
 * Copy is kept to a sentence or two: a tour has seconds, not minutes.
 * See `docs/feat-onboarding.md`.
 */

export interface TourContext {
  /** Name of the group the note the user just checked moved to, if it moved. */
  movedTo: string | null
  /** The mobile layout, where the board shows one group at a time. */
  isMobile: boolean
}

export interface TourStep {
  /** CSS selector of the element to spotlight; omitted for a centred card. A function
   *  decides from the context (the same step can point at different things per layout). */
  selector?: string | ((ctx: TourContext) => string | undefined)
  title: string | ((ctx: TourContext) => string)
  body: string | ((ctx: TourContext) => string)
  /** `'check'`: the target stays clickable and the step ends when a note is checked. */
  advance?: 'next' | 'check'
}

export interface Tour {
  id: string
  /** `user_state` key set when the tour finishes or is skipped, so it only ever runs once. */
  flagKey: string
  steps: TourStep[]
  /** Feature tours only: runs the first time the user lands on a matching path. */
  matchPath?: (path: string) => boolean
}

export const BOARD_TOUR_ID = 'board'

export const BOARD_TOUR: Tour = {
  id: BOARD_TOUR_ID,
  flagKey: BOARD_TOUR_SEEN_KEY,
  steps: [
    {
      selector: '[data-tour="add-note"]',
      title: 'Add a note',
      body: 'This + adds a note to a group. Give it a title and it is saved.',
    },
    {
      selector: '[data-tour="check"][aria-checked="false"]',
      title: 'Now check one off',
      body: 'Tap the circle on a note when it is done.',
      advance: 'check',
    },
    {
      // On mobile the board has already switched to the group the note went to, and this
      // step points at that tab, so it is clear why the view changed.
      selector: ({ movedTo, isMobile }) => (movedTo && isMobile ? '[data-tour="active-group-tab"]' : undefined),
      title: ({ movedTo, isMobile }) =>
        movedTo ? (isMobile ? `Moved to ${movedTo}` : 'It moved on') : 'Checked off',
      body: ({ movedTo, isMobile }) =>
        movedTo
          ? isMobile
            ? `Checking a note sends it to the next step. We switched to the "${movedTo}" tab for you, so you can see it there. Each group has its own rule in Settings.`
            : `Checking a note sends it to the next step, here "${movedTo}". Each group has its own rule in Settings.`
          : 'Groups can send checked notes on to the next step by themselves. Each group has its own rule in Settings.',
    },
    {
      selector: '[data-tour="nav"]',
      title: 'More lives here',
      body: 'Settings tunes your groups and sync. Apps has your Diary and Templates.',
    },
  ],
}

const isNoteEditor = (path: string) => path === '/notes/new' || /^\/notes\/[^/]+\/edit$/.test(path)

export const FEATURE_TOURS: Tour[] = [
  {
    id: 'note-editor',
    flagKey: 'tour.noteEditor',
    matchPath: isNoteEditor,
    steps: [
      {
        selector: '[data-tour="note-type"]',
        title: 'Three kinds of note',
        body: 'A task, a counter (like 3 of 5 glasses) or a checklist. Switch any time.',
      },
      {
        selector: '[data-tour="note-color"]',
        title: 'Colour and priority',
        body: 'Colour notes by hand, or let a group colour them by priority.',
      },
    ],
  },
  {
    id: 'settings',
    flagKey: 'tour.settings',
    matchPath: (path) => path === '/settings',
    steps: [
      {
        selector: '[data-tour="group-gear"]',
        title: 'Every group has settings',
        body: 'The gear opens a group: what happens on check, sorting and hiding old notes. Sync with Google is under Account & Sync.',
      },
    ],
  },
  {
    id: 'group-settings',
    flagKey: 'tour.groupSettings',
    matchPath: (path) => /^\/settings\/groups\/[^/]+$/.test(path),
    steps: [
      {
        selector: '[data-tour="group-on-check"]',
        title: 'The rule that moves notes',
        body: 'Pick the group a checked note goes to. This is how a board becomes a flow.',
      },
      {
        selector: '[data-tour="group-hide-after"]',
        title: 'Keep the board tidy',
        body: 'Hide finished notes after a while. They are never deleted: search and the Diary still find them.',
      },
    ],
  },
  {
    id: 'diary',
    flagKey: 'tour.diary',
    matchPath: (path) => path.startsWith('/apps/diary'),
    steps: [
      {
        title: 'Your Diary',
        body: 'Everything you create, move and check is logged here. Pick a day to replay how your board looked.',
      },
    ],
  },
  {
    id: 'templates',
    flagKey: 'tour.templates',
    matchPath: (path) => path.startsWith('/apps/templates'),
    steps: [
      {
        title: 'Templates',
        body: 'A template is a board layout. New workspaces start from one, and you can export, import or have an AI write one.',
      },
    ],
  },
  {
    id: 'search',
    flagKey: 'tour.search',
    matchPath: (path) => path === '/search',
    steps: [
      {
        title: 'Search everything',
        body: 'Find any note, including hidden and finished ones, and narrow it down with the filters.',
      },
    ],
  },
]

export function findTour(id: string): Tour | undefined {
  return id === BOARD_TOUR_ID ? BOARD_TOUR : FEATURE_TOURS.find((t) => t.id === id)
}

/** Every first-visit tour flag "Reset Tips" clears. The board tour is not one of them: it
 *  belongs to "Replay Intro". */
export const ALL_TOUR_FLAG_KEYS = FEATURE_TOURS.map((t) => t.flagKey)
