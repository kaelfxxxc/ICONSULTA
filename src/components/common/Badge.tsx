import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'indigo' | 'navy'

const tones: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-700',
  violet: 'bg-violet-100 text-violet-700',
  indigo: 'bg-brand-100 text-brand-700',
  navy: 'bg-navy-100 text-navy-800',
}

export function Badge({
  tone = 'gray',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
