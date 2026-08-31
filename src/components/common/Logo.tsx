import { cn } from '../../lib/utils'
import mark from '../../assets/images/logo-mark.png'
import lockup from '../../assets/images/ICONSULTA-horizontal-logo.png'

// Both logos are opaque artwork with their own white ground — 0% transparent
// pixels — so they need a white or light surface beneath them. On a dark surface,
// wrap them in a white plaque rather than dropping them straight on.
//
// Neither component bakes in a size: `cn` is a plain join, not tailwind-merge, so
// a default `h-9` would still be emitted alongside a caller's `h-10` and the
// winner would come down to Tailwind's output order. Call sites own the sizing.

/**
 * The ICONSULTA square mark, for tight chrome where the lockup's tagline would be
 * illegible (sidebar, drawer, 404).
 *
 * Decorative by default (`alt=""`) because those call sites pair it with the
 * wordmark as real text — announcing it again would just repeat the brand name.
 *
 * Size it square: `h-9 w-9`.
 */
export function LogoMark({
  className,
  alt = '',
}: {
  className?: string
  alt?: string
}) {
  return (
    <img
      src={mark}
      alt={alt}
      width={128}
      height={128}
      className={cn('shrink-0 rounded-xl object-contain', className)}
    />
  )
}

/**
 * The full horizontal lockup — mark, wordmark and tagline. Use it where there is
 * room to read the tagline; it replaces the text wordmark, so it carries a real
 * `alt` and should not sit beside a repeated "ICONSULTA".
 *
 * Size it by height and let the width follow — `h-8 w-auto lg:h-10` — so the
 * ~5.9:1 ratio is never squashed. `max-w-full` plus `object-contain` in the base
 * means a narrow viewport scales it down instead of overflowing.
 */
export function Logo({
  className,
  alt = 'ICONSULTA',
}: {
  className?: string
  alt?: string
}) {
  return (
    <img
      src={lockup}
      alt={alt}
      width={691}
      height={118}
      className={cn('max-w-full object-contain', className)}
    />
  )
}
