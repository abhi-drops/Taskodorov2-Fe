import { useEffect, useRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'
import type { IconHandle } from '@animateicons/react'

/** Any icon exported from `./icons` (an `@animateicons/react` component). */
export type AnimatedIconComponent = ForwardRefExoticComponent<
  { size?: number; isAnimated?: boolean } & RefAttributes<IconHandle>
>

interface AnimatedIconProps {
  icon: AnimatedIconComponent
  size?: number
  /** Decorative icon that never animates (e.g. inside a text field, or repeated in a grid). */
  still?: boolean
  className?: string
}

/**
 * Renders an icon from `./icons` and plays its animation when the button or link it sits
 * in is hovered (web) or tapped (Android has no hover). The library on its own only reacts
 * to the pointer being over the icon's own few pixels, so this listens on the nearest
 * interactive ancestor instead; call sites need no wiring. Colour follows `currentColor`,
 * so tint with a `text-*` class. Always `aria-hidden`: the accessible name belongs on the
 * button/link.
 */
export function AnimatedIcon({ icon: IconComponent, size = 20, still = false, className = '' }: AnimatedIconProps) {
  const wrapper = useRef<HTMLSpanElement>(null)
  const handle = useRef<IconHandle>(null)

  useEffect(() => {
    if (still) return
    const trigger = wrapper.current?.closest('a, button, [role="button"]') ?? wrapper.current
    if (!trigger) return
    const start = () => handle.current?.startAnimation()
    const stop = () => handle.current?.stopAnimation()
    trigger.addEventListener('mouseenter', start)
    trigger.addEventListener('mouseleave', stop)
    trigger.addEventListener('click', start)
    return () => {
      trigger.removeEventListener('mouseenter', start)
      trigger.removeEventListener('mouseleave', stop)
      trigger.removeEventListener('click', start)
    }
  }, [still])

  return (
    <span ref={wrapper} aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      {still ? <IconComponent size={size} isAnimated={false} /> : <IconComponent ref={handle} size={size} />}
    </span>
  )
}
