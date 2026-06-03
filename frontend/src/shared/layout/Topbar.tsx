import React from 'react'
import { Bell } from 'lucide-react'

export function Topbar({ topbar }: { topbar: { liveText: string; dateText: string; notificationsCount: number } }) {
  return (
    <div className="h-16 flex items-center justify-between px-6 bg-white/70 dark:bg-black/30 backdrop-blur-18 border-b border-black/5 dark:border-white/10">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-brand-green-50/80 dark:bg-white/5 border border-brand-green-100/60 flex items-center justify-center">
          <span className="text-lg" aria-hidden>
            🌾
          </span>
        </div>
        <div>
          <div className="text-sm font-semibold text-ink dark:text-white">AgroNexa LK</div>
          <div className="text-xs text-slate-600 dark:text-slate-300">Premium agriculture marketplace</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {topbar.liveText}
          </span>
        </div>
        <button
          type="button"
          className="relative h-10 w-10 rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all"
          aria-label="Notifications"
        >
          <Bell className="mx-auto h-5 w-5 text-slate-700 dark:text-slate-200" />
          {topbar.notificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-brand-amber-500 text-white text-[10px] font-bold flex items-center justify-center border border-white/60">
              {topbar.notificationsCount}
            </span>
          )}
        </button>
        <div className="hidden lg:block rounded-full bg-brand-green-50/80 dark:bg-white/5 px-4 py-2 text-xs font-semibold text-brand-green-700 dark:text-brand-green-300 border border-brand-green-100/60">
          {topbar.dateText}
        </div>
      </div>
    </div>
  )
}

