import React from 'react'

export function NavItem({ label, icon, badge, active }: { label: string; icon: React.ReactNode; badge: string | null; active: boolean }) {
  return (
    <div
      className={
        'group flex items-center gap-3 rounded-3xl px-4 py-3 cursor-pointer transition-all border ' +
        (active
          ? 'bg-gradient-to-r from-brand-green-50 to-brand-teal-50 dark:from-white/8 dark:to-white/5 border-brand-green-200/80 dark:border-white/10'
          : 'bg-transparent border-transparent hover:bg-black/[0.03] dark:hover:bg-white/5')
      }
      role="button"
      aria-current={active ? 'page' : undefined}
      tabIndex={0}
    >
      <span className={active ? 'text-brand-green-600 dark:text-brand-green-300' : 'text-slate-700 dark:text-slate-200 group-hover:text-brand-green-600 transition-colors'}>{icon}</span>
      <span className={active ? 'font-semibold text-ink dark:text-white' : 'text-slate-700 dark:text-slate-200 font-medium'}>{label}</span>
      {badge && (
        <span className={
          'ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ' +
          (active ? 'bg-brand-amber-500 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-200')
        }>
          {badge}
        </span>
      )}
    </div>
  )
}

