/**
 * The app's icon set: every icon comes from `@animateicons/react`'s Huge family, re-exported
 * here under app-level names so the choice of glyph lives in one place. Render them through
 * `AnimatedIcon`, not directly. (The note checkbox is the one exception: `CheckCircle`
 * still composites its own PNGs.) `AndroidIcon`/`WebVersionIcon` below are the deliberate
 * exceptions to "Huge only" — Huge has no smartphone-device or laptop/monitor glyph at all.
 */
export {
  Add01Icon as PlusIcon,
  AddSquareIcon,
  AlertCircleIcon as SyncPendingIcon,
  ArrowLeftRightIcon as MovedIcon,
  ArrowRight02Icon as ArrowRightIcon,
  BookOpen01Icon as DiaryIcon,
  Cancel01Icon as CloseIcon,
  ChatGptIcon,
  CheckIcon,
  CheckmarkCircle01Icon as SyncedIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon as DuplicateIcon,
  ClaudeIcon,
  Clock01Icon as PomodoroIcon,
  Delete02Icon as TrashIcon,
  DeliveryBox01Icon as GroupIcon,
  DownloadIcon as ExportIcon,
  DownloadIcon as UpdateIcon,
  GoogleGeminiIcon as GeminiIcon,
  Globe02Icon as WebsiteIcon,
  GridViewIcon as AppsIcon,
  Home01Icon as HomeIcon,
  InstagramIcon,
  LayoutTemplateIcon as TemplatesIcon,
  Loading02Icon as SyncingIcon,
  Menu01Icon as MenuIcon,
  Message01Icon as FeedbackIcon,
  MinusSignIcon as MinusIcon,
  PauseIcon,
  Pen01Icon as EditIcon,
  PlayIcon,
  Refresh01Icon as ResetIcon,
  Refresh01Icon as SyncIcon,
  Settings01Icon as SettingsIcon,
  SparklesIcon as AiGuideIcon,
  StarIcon,
  // Huge has no empty-circle glyph; "undo" is the closest reading of "unchecked".
  UndoIcon as UncheckedIcon,
  Upload01Icon as ImportIcon,
} from '@animateicons/react/huge'

// Huge has no smartphone-device or laptop/monitor glyph (only call-related `Phone*`
// icons, and nothing for "a computer" at all) — these two come from the Lucide family
// instead, also bundled in `@animateicons/react`.
export { SmartphoneIcon as AndroidIcon, LaptopIcon as WebVersionIcon } from '@animateicons/react/lucide'
