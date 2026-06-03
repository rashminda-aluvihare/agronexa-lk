import React from 'react'
import { cn } from '../../utils/cn'

export function Badge({ tone, children }: { tone: 'green' | 'amber' | 'red'; children: React.ReactNode }) {
  const cls =
    tone === 'green'
      ? 'bg-brand-green-50/90 dark:bg-white/5 text-brand-green-700 dark:text-brand-green-300 border-brand-green-100/60'
      : tone === 'amber'
        ? 'bg-brand-amber-50/90 dark:bg-white/5 text-brand-amber-700 dark:text-brand-amber-300 border-brand-amber-100/60'
        : 'bg-red-50/90 dark:bg-white/5 text-red-700 dark:text-red-300 border-red-200/60'

  return (
    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border', cls)}>
      {children}
    </span>
  )
}

