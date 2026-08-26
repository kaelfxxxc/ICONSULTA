import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'gray' | 'green' | 'amber' | 'red' | 'blue'

const tones: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-brand-100 text-brand-700',
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
