import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useDragControls } from 'motion/react'
import { AnimatedIcon } from '../ui/AnimatedIcon'
import { Button } from '../ui/Button'
import { Scrubber } from '../ui/Scrubber'
import { CheckCircle } from '../ui/CheckCircle'
import { DIALOG_PRIMARY_BUTTON } from '../ui/dialogStyles'
import { AndroidIcon, MinusIcon, PlusIcon, SyncIcon, WebVersionIcon } from '../ui/icons'
import { SWATCH_CLASSES, type SwatchColor } from '../ui/swatchColors'
import { pushBackHandler } from '../../lib/platform/backHandlers'
import { usePlatform } from '../../lib/platform/usePlatform'

/**
 * The first-run slides: five screens, a few seconds each, built from the app's own pieces
 * (sticky notes, the check circle, group chips) rather than screenshots, so they stay
 * sharp and follow the design tokens. Every slide is something to touch, not watch: drag
 * and check the notes, check one to see it move, work a counter and a checklist, scrub back through a day in the Diary, flip a
 * sync switch. The one line of text under each says what the slide is about, then what just happened. Lazy-loaded from `OnboardingHost`: this is the only
 * place onboarding imports `motion`, which `routes.tsx` keeps out of the main chunk on
 * purpose. `MotionConfig reducedMotion="user"` turns the movement off for people who ask
 * for it. Every way out (Skip, Start, Escape, Android Back on the first slide) ends in
 * `onDone`. See `docs/feat-onboarding.md`.
 */

const EASE = [0.2, 0, 0, 1] as const

/**
 * Every slide is the same shape: an illustration, a title and one short line. The line is
 * also the feedback while you play (it changes as you interact), so there is no separate
 * caption. `min-h-12` holds two lines so the layout does not jump when it changes.
 */
function SlideFrame({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
      <div className="flex min-h-56 w-full items-center justify-center">{children}</div>
      {/* A solid panel, the same light card as the board's columns: text over the grid
          paper had lines running through the letters. */}
      <div className="flex w-full flex-col gap-2 border border-edge bg-panel px-5 py-4 shadow-card">
        <h1 className="font-display text-2xl font-bold text-fg">{title}</h1>
        <p aria-live="polite" className="min-h-12 text-base text-fg/80">
          {body}
        </p>
      </div>
    </div>
  )
}

/**
 * A ring that pulses around the first thing to tap, until the user has tried the slide. It
 * replaces written instructions. Place it inside a `relative` box that wraps a `CheckCircle`
 * of the same `size`: the circle carries a left margin of `size * 0.909`, which the ring skips.
 */
function PulseRing({ size, show }: { size: number; show: boolean }) {
  if (!show) return null
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full border-2 border-ink"
      style={{ left: size * 0.909, top: 0, width: size, height: size }}
      animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
    />
  )
}

/** A task card as the board draws it (`BasicNoteCard`): same shape, shadow, title and check circle. */
function BoardNote({
  color,
  children,
  checked = false,
  onCheckedChange,
  hint = false,
  className = '',
}: {
  color: SwatchColor
  children: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** Pulse a ring on the circle to say "tap me". */
  hint?: boolean
  className?: string
}) {
  return (
    <div className={`flex flex-col rounded-card text-left shadow-card ${SWATCH_CLASSES[color]} ${className}`}>
      <div className="flex items-start justify-between gap-2 p-4">
        <p
          className={`min-w-0 flex-1 text-sm font-medium text-black transition-opacity ${
            checked ? 'line-through opacity-70' : ''
          }`}
        >
          {children}
        </p>
        <div className="relative shrink-0">
          <CheckCircle checked={checked} size={22} onChange={onCheckedChange} disabled={!onCheckedChange} className="!opacity-100" />
          <PulseRing size={22} show={hint} />
        </div>
      </div>
    </div>
  )
}

/** Slide 1: three notes that drop in, and can be dragged around and checked. */
function NotesDropIn() {
  const ref = useRef<HTMLDivElement>(null)
  const notes: { text: string; color: SwatchColor; rotate: number; left: number | 'auto'; right?: number; top: number }[] = [
    { text: 'Plan the trip', color: 'blue', rotate: -4, left: 0, top: 0 },
    { text: 'Call Sam', color: 'coral', rotate: 3, left: 'auto', right: 0, top: 64 },
    { text: 'Buy milk', color: 'yellow', rotate: -1, left: 28, top: 128 },
  ]
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [dragged, setDragged] = useState(false)
  const touched = dragged || Object.values(done).some(Boolean)

  return (
    <SlideFrame
      title="Your tasks, as sticky notes"
      body={
        touched
          ? 'Checked, moved, colour: they are all yours to change.'
          : 'Write down what you need to do, give each note a colour and sort them into groups.'
      }
    >
      <div ref={ref} data-no-swipe className="relative h-56 w-72">
        {notes.map((note, i) => (
          <motion.div
            key={note.text}
            drag
            dragConstraints={ref}
            dragElastic={0.15}
            dragMomentum={false}
            onDragStart={() => setDragged(true)}
            whileDrag={{ scale: 1.05, zIndex: 10, cursor: 'grabbing' }}
            className="absolute w-44 cursor-grab touch-none"
            style={{ left: note.left, right: note.right, top: note.top }}
            initial={{ opacity: 0, y: -48, rotate: note.rotate * 3 }}
            animate={{ opacity: 1, y: 0, rotate: note.rotate }}
            transition={{ delay: 0.12 + i * 0.16, duration: 0.32, ease: EASE }}
          >
            <BoardNote
              color={note.color}
              checked={done[note.text] === true}
              hint={i === 1 && !touched}
              onCheckedChange={(checked) => setDone((d) => ({ ...d, [note.text]: checked }))}
            >
              {note.text}
            </BoardNote>
          </motion.div>
        ))}
      </div>
    </SlideFrame>
  )
}

const COLUMN_NAMES = ['Todo', 'Doing', 'Done']

/** One group of the mini board used by slides 2 and 4: the board's chip over a column. */
function DemoColumn({ name, children }: { name: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="rounded-card border-[3px] border-ink bg-slate-300 px-2.5 py-0.5 font-display text-xs font-medium text-ink shadow-card">
        {name}
      </span>
      <div className="flex h-24 w-full flex-col gap-1.5 overflow-hidden border border-edge bg-panel p-1.5 shadow-card">
        {children}
      </div>
    </div>
  )
}

/**
 * Slide 2: the board's core idea, played by hand. Checking the note sends it to the next
 * group, as a real Todo group does: unchecked on arrival in Doing, kept checked in Done.
 */
function CheckMovesOn() {
  const [col, setCol] = useState(0)
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const SIZE = 18
  function onCheck() {
    if (busy) return
    setTouched(true)
    if (col === 2) {
      // Done: tapping again plays it from the start.
      setCol(0)
      setChecked(false)
      return
    }
    setChecked(true)
    setBusy(true)
    timer.current = window.setTimeout(() => {
      if (col === 0) {
        setCol(1)
        setChecked(false)
      } else {
        setCol(2)
        setChecked(true)
      }
      setBusy(false)
    }, 450)
  }

  const body = [
    'Checking a note can send it to the next step of your board. Give it a try.',
    'It arrived in Doing, unchecked. Check it again.',
    'Done. Tap the circle to play it again.',
  ][col]

  return (
    <SlideFrame title="Check it, it moves on" body={body}>
      <LayoutGroup>
        <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2">
          {COLUMN_NAMES.map((name, i) => (
            <DemoColumn key={name} name={name}>
              {col === i && (
                <motion.div
                  layoutId="demo-note"
                  transition={{ duration: 0.3, ease: EASE }}
                  className={`flex items-start justify-between gap-1 rounded-card p-2 text-left shadow-card ${SWATCH_CLASSES.yellow}`}
                >
                  <p className={`text-xs font-medium text-black ${checked && i === 2 ? 'line-through opacity-70' : ''}`}>
                    Call Sam
                  </p>
                  {/* The board's check circle carries a left margin; cancel it here, the column is narrow. */}
                  <div className="relative shrink-0" style={{ marginLeft: -SIZE * 0.909 }}>
                    <CheckCircle checked={checked} size={SIZE} onChange={onCheck} className="!opacity-100" />
                    <PulseRing size={SIZE} show={!touched} />
                  </div>
                </motion.div>
              )}
            </DemoColumn>
          ))}
        </div>
      </LayoutGroup>
    </SlideFrame>
  )
}

const COUNTER_TARGET = 8

/** Slide 3: the three note types, each working: tick the task, count up, tick the list. */
function NoteTypes() {
  const [taskDone, setTaskDone] = useState(false)
  const [count, setCount] = useState(3)
  const [counterDone, setCounterDone] = useState(false)
  const [items, setItems] = useState([
    { text: 'Passport', done: true },
    { text: 'Charger', done: false },
  ])

  const cardMotion = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.1 + i * 0.14, duration: 0.28, ease: EASE },
  })
  // Like the board: reaching the target checks the counter by itself.
  function adjust(delta: number) {
    const next = Math.max(0, count + delta)
    setCount(next)
    if (next >= COUNTER_TARGET) setCounterDone(true)
  }
  const touched = taskDone || counterDone || count !== 3 || items.some((item, i) => item.done !== (i === 0))

  return (
    <SlideFrame
      title="Notes that fit the job"
      body={
        touched
          ? 'A counter checks itself off when it reaches its target.'
          : 'Plain tasks, counters like 3 of 8, and checklists. Give them a go.'
      }
    >
      <div className="mx-auto flex w-full max-w-xs flex-col gap-2.5 text-left">
        <motion.div {...cardMotion(0)}>
          <BoardNote color="green" checked={taskDone} onCheckedChange={setTaskDone} hint={!touched}>
            Water the plants
          </BoardNote>
        </motion.div>

        <motion.div {...cardMotion(1)} className={`flex flex-col gap-2.5 rounded-card p-3.5 shadow-card ${SWATCH_CLASSES.blue}`}>
          <div className="flex items-start justify-between gap-2">
            <p className={`min-w-0 flex-1 text-sm font-medium text-black ${counterDone ? 'line-through opacity-70' : ''}`}>
              Glasses of water
            </p>
            <div className="shrink-0">
              <CheckCircle checked={counterDone} size={22} onChange={setCounterDone} className="!opacity-100" />
            </div>
          </div>
          <div className="flex items-stretch divide-x-[3px] divide-ink overflow-hidden rounded-card border-[3px] border-ink">
            <button
              type="button"
              aria-label="Add one"
              onClick={() => adjust(1)}
              className="flex items-center bg-white/50 px-3 py-1.5 text-ink hover:bg-white/60 active:bg-white/70"
            >
              <AnimatedIcon icon={PlusIcon} size={24} className="[&_svg]:stroke-[2.5]" />
            </button>
            <span className="flex flex-1 items-center justify-center font-display text-xl font-bold text-ink">
              {count}/{COUNTER_TARGET}
            </span>
            <button
              type="button"
              aria-label="Remove one"
              onClick={() => adjust(-1)}
              className="flex items-center bg-white/50 px-3 py-1.5 text-ink hover:bg-white/60 active:bg-white/70"
            >
              <AnimatedIcon icon={MinusIcon} size={24} className="[&_svg]:stroke-[2.5]" />
            </button>
          </div>
        </motion.div>

        <motion.div {...cardMotion(2)} className="flex flex-col">
          <p className={`rounded-card px-4 pb-2.5 pt-3.5 text-sm font-medium text-black shadow-card ${SWATCH_CLASSES.coral}`}>
            Packing list
          </p>
          <ul className={`ml-4 flex flex-col gap-1.5 rounded-card px-4 pb-3.5 pt-2.5 shadow-card ${SWATCH_CLASSES.coral}`}>
            {items.map((item, i) => (
              <li key={item.text} className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  <CheckCircle
                    checked={item.done}
                    size={18}
                    onChange={(done) => setItems((list) => list.map((it, j) => (j === i ? { ...it, done } : it)))}
                    className="!opacity-100"
                  />
                </div>
                <span className={`min-w-0 text-sm text-black ${item.done ? 'line-through opacity-70' : ''}`}>{item.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </SlideFrame>
  )
}

/**
 * The day replayed in slide 4. Each frame is where the two notes were at that moment
 * (`null` = not created yet), as the Diary's replay shows a real day.
 */
const DIARY_FRAMES = [
  { sam: 0, milk: null, line: '9:00. You add "Call Sam" to Todo.' },
  { sam: 0, milk: 0, line: '11:30. You add "Buy milk".' },
  { sam: 1, milk: 0, line: '13:00. "Call Sam" moves to Doing.' },
  { sam: 2, milk: 0, line: '16:00. "Call Sam" is done. Drag the timeline to go back.' },
] as const
const LAST_DIARY_FRAME = DIARY_FRAMES.length - 1

/**
 * Slide 4 on desktop: the Diary's replay. Plays one day through by itself, then the real timeline scrubber (the
 * Diary's own `Scrubber`) lets you drag back and forth through it.
 */
function DiaryReplay() {
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)

  // Starts by itself shortly after the slide appears, once.
  useEffect(() => {
    const id = window.setTimeout(() => setPlaying(true), 700)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!playing) return
    const id = window.setTimeout(
      () => (frame >= LAST_DIARY_FRAME ? setPlaying(false) : setFrame(frame + 1)),
      frame >= LAST_DIARY_FRAME ? 0 : 1100,
    )
    return () => window.clearTimeout(id)
  }, [playing, frame])

  const { sam, milk, line } = DIARY_FRAMES[frame]

  return (
    <SlideFrame title="Replay any day" body={line}>
      <div className="flex w-full flex-col items-center gap-4">
        <LayoutGroup>
          <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2">
            {COLUMN_NAMES.map((name, i) => (
              <DemoColumn key={name} name={name}>
                {sam === i && (
                  <motion.div
                    layoutId="diary-sam"
                    transition={{ duration: 0.3, ease: EASE }}
                    className={`rounded-card p-2 text-left text-xs font-medium text-black shadow-card ${SWATCH_CLASSES.coral} ${
                      i === 2 ? 'line-through opacity-70' : ''
                    }`}
                  >
                    Call Sam
                  </motion.div>
                )}
                {milk === i && (
                  <motion.div
                    layoutId="diary-milk"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={`rounded-card p-2 text-left text-xs font-medium text-black shadow-card ${SWATCH_CLASSES.blue}`}
                  >
                    Buy milk
                  </motion.div>
                )}
              </DemoColumn>
            ))}
          </div>
        </LayoutGroup>
        <div data-no-swipe className="w-full max-w-sm">
          <Scrubber
            frameCount={DIARY_FRAMES.length}
            frame={frame}
            onChange={(next) => {
              setPlaying(false)
              setFrame(next)
            }}
            playing={playing}
            onTogglePlay={() => {
              if (playing) {
                setPlaying(false)
                return
              }
              // At the end, Play starts the day over.
              if (frame >= LAST_DIARY_FRAME) setFrame(0)
              setPlaying(true)
            }}
            label="Replay the day"
          />
        </div>
      </div>
    </SlideFrame>
  )
}

/** The Diary's colour scheme (`DiarySidebar.tsx`): violet created, blue moved, green checked. */
const DIARY_TONES = {
  violet: 'bg-accent-purple text-white',
  blue: 'bg-sticky-blue text-ink',
  green: 'bg-sticky-green text-ink',
} as const
type DiaryTone = keyof typeof DIARY_TONES

interface DiaryDay {
  weekday: string
  date: number
  today?: boolean
  /** Dots on the day, as in the calendar (no numbers on mobile). */
  dots: DiaryTone[]
  changes: { chip: string; tone: DiaryTone; text: string }[]
  line: string
}

/** Three days of a small board, for the mobile Diary slide. */
const DIARY_DAYS: DiaryDay[] = [
  {
    weekday: 'Wed',
    date: 5,
    dots: ['violet', 'blue'],
    changes: [
      { chip: 'Created', tone: 'violet', text: 'Plan the trip' },
      { chip: 'Created', tone: 'violet', text: 'Call Sam' },
      { chip: 'Moved', tone: 'blue', text: 'Call Sam to Doing' },
    ],
    line: 'Wed 5. Two notes created, one moved.',
  },
  {
    weekday: 'Thu',
    date: 6,
    dots: ['green'],
    changes: [{ chip: 'Checked', tone: 'green', text: 'Call Sam' }],
    line: 'Thu 6. One note checked off.',
  },
  {
    weekday: 'Fri',
    date: 7,
    today: true,
    dots: ['violet', 'blue', 'green'],
    changes: [
      { chip: 'Created', tone: 'violet', text: 'Buy milk' },
      { chip: 'Moved', tone: 'blue', text: 'Buy milk to Doing' },
      { chip: 'Checked', tone: 'green', text: 'Buy milk' },
    ],
    line: 'Fri 7. One created, one moved, one checked.',
  },
]

/**
 * Slide 4 on mobile. The real mobile Diary has no replay: it is a calendar with coloured
 * dots, and tapping a day opens a summary of what changed. This is three days of that: tap
 * a day to see its changes. Deliberately just the strip and the list: the real summary also
 * has count tiles, which here would only repeat the list.
 */
function DiarySummary() {
  const [selected, setSelected] = useState(DIARY_DAYS.length - 1)
  const [touched, setTouched] = useState(false)
  const day = DIARY_DAYS[selected]

  return (
    <SlideFrame
      title="Your board's diary"
      body={touched ? day.line : 'Every change is saved by day. Tap a day to see it.'}
    >
      <div className="flex w-full max-w-xs flex-col gap-4 text-left">
        <div className="flex justify-center gap-3">
          {DIARY_DAYS.map((d, i) => {
            const active = i === selected
            return (
              <div key={d.date} className="relative">
                {!touched && i === 0 && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-1 rounded-card border-2 border-line"
                    animate={{ opacity: [0.7, 0], scale: [1, 1.15] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTouched(true)
                    setSelected(i)
                  }}
                  aria-label={`${d.weekday} ${d.date}`}
                  aria-pressed={active}
                  className={`relative flex h-16 w-16 flex-col items-center justify-center gap-1.5 rounded-card border-2 border-ink text-ink shadow-card ${
                    active ? 'bg-ink text-white' : d.today ? 'bg-sticky-yellow' : 'bg-white'
                  }`}
                >
                  <span className="font-display text-xl font-bold leading-none">{d.date}</span>
                  <span className="flex h-2 gap-0.5">
                    {d.dots.map((tone) => (
                      <span key={tone} className={`h-2 w-2 rounded-full border border-ink ${DIARY_TONES[tone].split(' ')[0]}`} />
                    ))}
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        <motion.ul
          key={selected}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="flex h-[6.75rem] flex-col gap-2 overflow-hidden border border-edge bg-panel p-3 shadow-card"
        >
          {day.changes.map((c) => (
            <li key={c.chip + c.text} className="flex items-center gap-2 text-xs text-fg">
              <span
                className={`inline-flex shrink-0 rounded-card border-2 border-ink px-1.5 font-display text-[10px] font-bold uppercase leading-4 ${DIARY_TONES[c.tone]}`}
              >
                {c.chip}
              </span>
              <span className="min-w-0 flex-1 truncate">{c.text}</span>
            </li>
          ))}
        </motion.ul>
      </div>
    </SlideFrame>
  )
}

/** Desktop replays a day with a scrubber; mobile has no replay, so it shows the day summary. */
function DiarySlide() {
  const { isMobile } = usePlatform()
  return isMobile ? <DiarySummary /> : <DiaryReplay />
}

/** A small device with a note on it, for slide 5. Flat, like a note: colour and shadow, no frame. */
function Device({
  icon,
  label,
  className,
  children,
}: {
  icon: typeof AndroidIcon
  label: string
  className: string
  children: ReactNode
}) {
  return (
    <div className={`flex w-28 flex-col items-center gap-2 rounded-card p-3 text-ink shadow-card ${className}`}>
      <AnimatedIcon icon={icon} size={24} still />
      <div className="flex h-12 w-full items-center justify-center">{children}</div>
      <span className="text-xs font-medium text-ink/70">{label}</span>
    </div>
  )
}

function MiniNote() {
  return (
    <div className={`w-full rounded-card p-2 text-left text-xs font-medium text-black shadow-card ${SWATCH_CLASSES.coral}`}>
      Call Sam
    </div>
  )
}

/**
 * Slide 5: a demo switch. Off, the note lives on this device only and works offline; on,
 * it appears on a second device. It is only a demo: real sync needs a Google sign-in in
 * Settings, and the line says so.
 */
function StaysOnDevice() {
  const [sync, setSync] = useState(false)
  const [touched, setTouched] = useState(false)

  return (
    <SlideFrame
      title="Kept on your device"
      body={
        sync
          ? 'Synced to your other devices. Demo only: real sync needs a Google sign-in in Settings.'
          : 'Saved here and works offline. Flip the switch to preview optional sync.'
      }
    >
      <div className="flex w-full flex-col items-center gap-6">
        <div className="flex items-center justify-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <Device icon={AndroidIcon} label="This device" className="bg-sticky-yellow">
              <MiniNote />
            </Device>
          </motion.div>
          <motion.div
            animate={{ rotate: sync ? 360 : 0 }}
            transition={sync ? { duration: 2.5, ease: 'linear', repeat: Infinity } : { duration: 0.2 }}
            className={sync ? 'text-fg' : 'text-fg/25'}
          >
            <AnimatedIcon icon={SyncIcon} size={22} still />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.28, ease: EASE }}
          >
            <Device icon={WebVersionIcon} label="Another device" className="bg-sticky-blue">
              <AnimatePresence mode="wait" initial={false}>
                {sync ? (
                  <motion.div
                    key="note"
                    className="w-full"
                    initial={{ opacity: 0, scale: 0.6, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    <MiniNote />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    className="h-full w-full rounded-card border-2 border-dashed border-line/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                )}
              </AnimatePresence>
            </Device>
          </motion.div>
        </div>

        <div className="relative">
          {!touched && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 rounded-card border-2 border-line"
              animate={{ opacity: [0.7, 0], scale: [1, 1.12] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <button
            type="button"
            role="switch"
            aria-checked={sync}
            onClick={() => {
              setTouched(true)
              setSync((on) => !on)
            }}
            className="relative inline-flex items-center gap-3 rounded-card border-[3px] border-ink bg-white px-4 py-2 text-sm font-medium text-ink shadow-card"
          >
            Sync with Google
            <span
              aria-hidden="true"
              className={`relative h-6 w-11 border-2 border-ink transition-colors ${sync ? 'bg-ink' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 bg-white outline outline-2 outline-ink transition-all ${
                  sync ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </span>
          </button>
        </div>
      </div>
    </SlideFrame>
  )
}

const SLIDES = [NotesDropIn, CheckMovesOn, NoteTypes, DiarySlide, StaysOnDevice]

export default function IntroSlides({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const isLast = index === SLIDES.length - 1
  // Swiping between slides starts only from the empty parts of a slide: anything marked
  // `data-no-swipe` (draggable notes, the Diary timeline) keeps its own drag.
  const swipe = useDragControls()

  const go = useCallback(
    (to: number) => {
      if (to < 0) return
      if (to >= SLIDES.length) {
        onDone()
        return
      }
      setDirection(to > index ? 1 : -1)
      setIndex(to)
    },
    [index, onDone],
  )

  // The page behind must not scroll (or show its scrollbar) while the slides cover it.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Escape skips; Android Back steps to the previous slide, or skips from the first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone()
      else if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
    }
    document.addEventListener('keydown', onKey)
    const popBack = pushBackHandler(() => (index === 0 ? onDone() : go(index - 1)))
    return () => {
      document.removeEventListener('keydown', onKey)
      popBack()
    }
  }, [index, go, onDone])

  const Slide = SLIDES[index]

  return createPortal(
    <MotionConfig reducedMotion="user">
      <div
        role="dialog"
        aria-label="Welcome to Taskodoro"
        className="bg-grid fixed inset-0 z-[80] flex flex-col"
        style={{
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex justify-end px-6">
          <button type="button" onClick={onDone} className="text-sm font-medium text-fg/60 hover:text-fg">
            Skip
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.22, ease: EASE }}
              drag="x"
              dragListener={false}
              dragControls={swipe}
              onPointerDown={(e) => {
                if (!(e.target as Element).closest('[data-no-swipe]')) swipe.start(e)
              }}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(index + 1)
                else if (info.offset.x > 60) go(index - 1)
              }}
              className="flex w-full max-w-md justify-center"
            >
              <Slide />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-5 px-6">
          <div className="flex gap-2" aria-hidden="true">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 border-2 border-line ${i === index ? 'bg-accent-purple' : 'bg-white'}`}
              />
            ))}
          </div>
          <Button onClick={() => go(index + 1)} className={`w-full max-w-xs ${DIALOG_PRIMARY_BUTTON}`}>
            {isLast ? 'Start' : 'Next'}
          </Button>
        </div>
      </div>
    </MotionConfig>,
    document.body,
  )
}
