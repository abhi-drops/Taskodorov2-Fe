/**
 * The app's icon set: every icon comes from `@animateicons/react`'s Huge family, re-exported
 * here under app-level names so the choice of glyph lives in one place. Render them through
 * `AnimatedIcon`, not directly. (The note checkbox is the one exception: `CheckCircle`
 * still composites its own PNGs.)
 */
export {
  Add01Icon as PlusIcon,
  AddSquareIcon,
  ArrowLeftRightIcon as MovedIcon,
  ArrowRight02Icon as ArrowRightIcon,
  BookOpen01Icon as DiaryIcon,
  Cancel01Icon as CloseIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock01Icon as PomodoroIcon,
  Delete02Icon as TrashIcon,
  DeliveryBox01Icon as GroupIcon,
  GridViewIcon as AppsIcon,
  Home01Icon as HomeIcon,
  Menu01Icon as MenuIcon,
  MinusSignIcon as MinusIcon,
  PauseIcon,
  Pen01Icon as EditIcon,
  PlayIcon,
  Refresh01Icon as ResetIcon,
  Settings01Icon as SettingsIcon,
  // Huge has no empty-circle glyph; "undo" is the closest reading of "unchecked".
  UndoIcon as UncheckedIcon,
} from '@animateicons/react/huge'
