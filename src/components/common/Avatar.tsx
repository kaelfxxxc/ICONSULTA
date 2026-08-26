import { cn, initials } from '../../lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const sizes: Record<Size, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
}

/** Circular avatar — shows the photo when present, otherwise initials. */
export function Avatar({
  name,
  src,
  size = 'sm',
  className,
}: {
  name: string | null | undefined
  src?: string | null
  size?: Size
  className?: string
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'avatar'}
        className={cn('shrink-0 rounded-full object-cover', sizes[size], className)}
      />
    )
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
