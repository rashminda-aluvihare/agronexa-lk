import React from 'react'

export function GlassCard({
  title,
  subtitle,
  actionLabel,
  children,
}: {
  title: string
  subtitle?: string
  actionLabel?: string | null
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-18 shadow-soft hover:shadow-lg transition-shadow">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-ink dark:text-white">{title}</h2>
            {subtitle && <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{subtitle}</div>}
          </div>
          {actionLabel ? (
            <div className="text-sm font-semibold text-brand-green-600 dark:text-brand-green-300 cursor-pointer hover:underline underline-offset-4">
              {actionLabel}
            </div>
          ) : (
            <div />
          )}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  )
}

