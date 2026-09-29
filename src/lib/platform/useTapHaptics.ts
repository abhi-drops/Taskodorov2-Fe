import { useEffect } from 'react'
import { haptics } from './haptics'
import { usePlatform } from './usePlatform'

type HapticStrength = 'light' | 'medium' | 'heavy'

/** Everything that counts as "a button" for tap feedback. */
const TAPPABLE =
  'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="checkbox"], input[type="checkbox"], input[type="radio"]'

const isStrength = (value: string | undefined): value is HapticStrength =>
  value === 'light' || value === 'medium' || value === 'heavy'

/**
 * App-wide tap haptics on native: one delegated `click` listener (capture phase) on the
 * document instead of a handler on every button, so every current *and future* button,
 * link, tab, switch and checkbox gets feedback automatically.
 *
 * - Default: light impact.
 * - Checkboxes (`role="checkbox"`, e.g. `CheckCircle`, or a native checkbox): medium when
 *   checking, light when unchecking — completing something should feel more final.
 *   Read *before* React handles the click, so `aria-checked`/`checked` is still the
 *   old value.
 * - Per-element override: `data-haptic="light" | "medium" | "heavy" | "none"` on the
 *   element (or an ancestor inside it — the closest tappable decides).
 * - `click` (not `pointerdown`) so a touch that turns into a scroll never buzzes;
 *   disabled controls don't fire `click`, and `aria-disabled` ones are skipped too.
 *
 * Mounted once in `App.tsx`. See `docs/feat-navigation.md` ("Haptics").
 */
export function useTapHaptics() {
  const { isNative } = usePlatform()

  useEffect(() => {
    if (!isNative) return

    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(TAPPABLE) : null
      if (!target || target.getAttribute('aria-disabled') === 'true') return

      const override = target.dataset.haptic
      if (override === 'none') return
      if (isStrength(override)) {
        haptics[override]()
        return
      }

      const isCheckbox =
        target.getAttribute('role') === 'checkbox' || (target instanceof HTMLInputElement && target.type === 'checkbox')
      if (isCheckbox) {
        const wasChecked =
          target instanceof HTMLInputElement
            ? // Native checkboxes toggle *before* click listeners run.
              !target.checked
            : target.getAttribute('aria-checked') === 'true'
        if (wasChecked) haptics.light()
        else haptics.medium()
        return
      }

      haptics.light()
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [isNative])
}
