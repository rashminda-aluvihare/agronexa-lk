import React from 'react'
import { cn } from '../../utils/cn'

export function StatCard({
  tone,
  icon,
  value,
  label,
  footer,
}: {
  tone: 'green' | 'amber' | 'blue' | 'purple' | 'teal'
  icon: React.ReactNode
  value: React.ReactNode
  label: string
  footer?: string
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-brand-green-50/70 dark:bg-white/5 border-brand-green-100/70'
      : tone === 'amber'
        ? 'bg-brand-amber-50/70 dark:bg-white/5 border-brand-amber-100/70'
        : tone === 'blue'
          ? 'bg-brand-blue-50/70 dark:bg-white/5 border-brand-blue-100/70'
          : tone === 'purple'
            ? 'bg-brand-purple-50/70 dark:bg-white/5 border-brand-purple-100/70'
            : 'bg-brand-teal-50/70 dark:bg-white/5 border-brand-teal-100/70'

  const iconTone =
    tone === 'green'
      ? 'text-brand-green-600 dark:text-brand-green-300 bg-brand-green-100/60 dark:bg-white/5 border-brand-green-100/70'
      : tone === 'amber'
        ? 'text-brand-amber-600 dark:text-brand-amber-300 bg-brand-amber-100/60 dark:bg-white/5 border-brand-amber-100/70'
        : tone === 'blue'
          ? 'text-brand-blue-600 dark:text-brand-blue-300 bg-brand-blue-100/60 dark:bg-white/5 border-brand-blue-100/70'
          : tone === 'purple'
            ? 'text-brand-purple-600 dark:text-brand-purple-300 bg-brand-purple-100/60 dark:bg-white/5 border-brand-purple-100/70'
            : 'text-brand-teal-600 dark:text-brand-teal-300 bg-brand-teal-100/60 dark:bg-white/5 border-brand-teal-100/70'

  return (
    <div
      className={cn(
        'rounded-3xl border p-5 sm:p-6 transition-all hover:-translate-y-0.5 hover:shadow-soft',
        toneClass,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={cn('h-11 w-11 rounded-2xl border flex items-center justify-center', iconTone)}>{icon}</div>
      </div>
      <div className="mt-4">
        <div className="text-2xl sm:text-3xl font-semibold text-ink dark:text-white leading-tight">{value}</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 font-medium">{label}</div>
        {footer && <div className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">{footer}</div>}
      </div>
    </div>
  )
}

