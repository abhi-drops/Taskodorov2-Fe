import { Modal } from './ui/Modal'
import { useIntro } from '../common_logics/useIntro'
import introImg from '../assets/intro.png'
import introMobileImg from '../assets/intro-mob.png'

/** Same frosted-white-dim + deeper-offset-shadow treatment used by `WorkspaceSwitcher`
 * and `ConfirmDialog` — see `docs/style-guide.md`'s `Modal.tsx` entry for why these are
 * full replacements, not additions, to the defaults. */
const OVERLAY = 'bg-white/60 backdrop-blur-sm'
const SHADOW = 'shadow-[6px_10px_0px_0px_rgba(0,0,0,0.25)] !max-w-lg md:!max-w-2xl lg:!max-w-3xl'

/** Shown once, the first time the app is opened on a device (persisted via
 * `taskodoro.intro.seen` in Preferences, see `useIntro`). No title is passed to
 * `Modal` — the image itself carries the "How To Use This Template" heading — so the
 * header row is just the close (×) button, pinned top-right by `Modal`'s own
 * `ml-auto`. Two source images (a taller portrait crop for narrow screens, a wider
 * landscape one for desktop) are swapped via the same `md:` breakpoint the modal's own
 * width scales at — a CSS-only swap rather than `usePlatform().isNative`, since this is
 * about which crop reads best at a given viewport width, not a native-vs-web behavior
 * fork. */
export function IntroModal() {
  const { isOpen, dismiss } = useIntro()

  return (
    <Modal isOpen={isOpen} onClose={dismiss} variant="center" overlayClassName={OVERLAY} panelClassName={SHADOW}>
      <img src={introMobileImg} alt="How to use this template" className="w-full rounded-card md:hidden" />
      <img src={introImg} alt="How to use this template" className="hidden w-full rounded-card md:block" />
    </Modal>
  )
}
