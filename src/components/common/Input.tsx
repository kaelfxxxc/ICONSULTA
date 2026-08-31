import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

// Shared field styling for text inputs and native selects, so both read as one
// control set. Pale surface, navy focus ring. Import this in call sites that need
// a <select> to match the <Input> look (e.g. the department picker on the sign-in
// screen) rather than re-typing the classes.
export const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-navy-500 focus:bg-white focus:ring-4 focus:ring-navy-100'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Optional node aligned to the right of the label row (e.g. a "Forgot password?" link). */
  labelRight?: ReactNode
  /** Leading adornment inside the field (e.g. a mail icon). Adds left padding. */
  icon?: ReactNode
  /** Trailing adornment inside the field (e.g. a show/hide toggle). Adds right padding. */
  trailing?: ReactNode
  error?: string
}

export function Input({
  label,
  labelRight,
  icon,
  trailing,
  error,
  className,
  ...rest
}: Props) {
  return (
    <label className="block">
      {(label || labelRight) && (
        <span className="mb-1.5 flex items-center justify-between gap-2">
          {label ? (
            <span className="text-sm font-medium text-slate-700">{label}</span>
          ) : (
            <span />
          )}
          {labelRight}
        </span>
      )}
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          className={cn(
            fieldClass,
            !!icon && 'pl-10',
            !!trailing && 'pr-10',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
            className,
          )}
          {...rest}
        />
        {trailing && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {trailing}
          </span>
        )}
      </span>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}
