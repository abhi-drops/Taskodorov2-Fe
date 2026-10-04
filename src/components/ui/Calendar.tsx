import { createContext, useContext, type ReactNode } from 'react'
import { DayPicker, type DayButtonProps } from 'react-day-picker'
import { addMonths, format } from 'date-fns'
import { AnimatedIcon } from './AnimatedIcon'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

/**
 * Generic month-grid calendar on react-day-picker v9, styled entirely with the app's
 * own tokens. Its stylesheet is deliberately **not** imported: square cells
 * (`rounded-card`), ink borders and `shadow-card` come from the class names below.
 * No Diary logic lives here: callers put per-day content in `renderDay`, which renders
 * under the day number. See `docs/style-guide.md`.
 *
 * Navigation is our own header (yellow square chevron buttons and the month name, as in the
 * Diary wireframe) instead of react-day-picker's, so the month is fully controlled by
 * `month`/`onMonthChange`.
 */

interface CalendarProps {
  month: Date
  onMonthChange: (month: Date) => void
  onDayClick?: (date: Date) => void
  /** Extra content inside a day cell, below the date number. */
  renderDay?: (date: Date) => ReactNode
  className?: string
}

/**
 * `renderDay` reaches the module-level `CalendarDayButton` through context. Defining the
 * day component inline would give it a new identity every render, remounting every
 * cell (and losing keyboard focus).
 */
const RenderDayContext = createContext<((date: Date) => ReactNode) | undefined>(undefined)

function CalendarDayButton({ day, modifiers, className = '', ...buttonProps }: DayButtonProps) {
  const renderDay = useContext(RenderDayContext)
  const tone = modifiers.today ? 'bg-sticky-yellow' : 'bg-white hover:bg-slate-50'
  return (
    <button
      {...buttonProps}
      className={`flex h-full min-h-14 w-full flex-col items-start gap-1 rounded-card border-2 border-ink p-1.5 text-left shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple lg:min-h-20 ${tone} ${
        modifiers.outside ? 'opacity-40' : ''
      } ${className}`}
    >
      <span className="font-display text-xs font-bold leading-none text-ink">{format(day.date, 'd')}</span>
      {!modifiers.outside && renderDay?.(day.date)}
    </button>
  )
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-card border-2 border-ink bg-sticky-yellow font-display text-sm font-bold leading-none text-ink shadow-card hover:opacity-90"
    >
      {children}
    </button>
  )
}

export function Calendar({ month, onMonthChange, onDayClick, renderDay, className = '' }: CalendarProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-nav-dark">{format(month, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-2">
          <NavButton label="Previous month" onClick={() => onMonthChange(addMonths(month, -1))}>
            <AnimatedIcon icon={ChevronLeftIcon} size={16} />
          </NavButton>
          <NavButton label="Next month" onClick={() => onMonthChange(addMonths(month, 1))}>
            <AnimatedIcon icon={ChevronRightIcon} size={16} />
          </NavButton>
        </div>
      </div>
      <RenderDayContext.Provider value={renderDay}>
        <DayPicker
          month={month}
          onMonthChange={onMonthChange}
          onDayClick={(date, modifiers) => {
            if (!modifiers.outside) onDayClick?.(date)
          }}
          hideNavigation
          showOutsideDays
          fixedWeeks
          components={{ DayButton: CalendarDayButton, MonthCaption: () => <></> }}
          classNames={{
            root: 'w-full',
            months: 'w-full',
            month: 'w-full',
            month_grid: 'w-full table-fixed border-separate border-spacing-1',
            weekdays: '',
            weekday: 'pb-1 text-center text-xs font-medium text-slate-600',
            week: '',
            day: 'h-full p-0 align-top',
            day_button: '',
          }}
        />
      </RenderDayContext.Provider>
    </div>
  )
}
