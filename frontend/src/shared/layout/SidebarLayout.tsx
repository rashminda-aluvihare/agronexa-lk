import React from 'react'
import { Bell, Calendar, Menu, Moon, ShieldCheck, Sun, Wheat } from 'lucide-react'
import { SidebarNav } from './SidebarNav'
import { Topbar } from './Topbar'

export type SidebarUser = {
  avatarText: string
  name: string
  district: string
  badge: string
}

type Props = {
  role: 'seller' | 'buyer'
  user: SidebarUser
  activeNav: string
  onSwitchRole: () => void
  topbar: {
    liveText: string
    dateText: string
    notificationsCount: number
  }
  children: React.ReactNode
}

export function SidebarLayout({ role, user, activeNav, onSwitchRole, topbar, children }: Props) {
  return (
    <div className="min-h-full">
      <div className="relative">
        <div className="hidden md:block md:fixed md:inset-y-0 md:left-0 md:w-72 md:z-30">
          <SidebarNav role={role} user={user} activeNav={activeNav} onSwitchRole={onSwitchRole} />
        </div>

        {/* Mobile sidebar */}
        <div className="md:hidden fixed inset-x-0 top-0 z-40">
          <TopbarMobile role={role} user={user} onSwitchRole={onSwitchRole} topbar={topbar} />
        </div>

        <div className="md:pl-72">
          <div className="hidden md:block sticky top-0 z-30">
            <Topbar topbar={topbar} />
          </div>

          <main className="p-4 sm:p-6 lg:p-8 pb-10 md:pt-6">
            {children}
          </main>
        </div>

        <ThemeMount />
      </div>
    </div>
  )
}

function ThemeMount() {
  React.useEffect(() => {
    const stored = localStorage.getItem('agronexa-theme')
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldDark = stored ? stored === 'dark' : prefersDark
    document.documentElement.classList.toggle('dark', shouldDark)
  }, [])
  return null
}

function TopbarMobile({ topbar }: { role: string; user: SidebarUser; onSwitchRole: () => void; topbar: Props['topbar'] }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="bg-white/70 dark:bg-black/30 backdrop-blur-18 border-b border-black/5 dark:border-white/10">
      <div className="h-14 px-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="h-10 w-10 rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 flex items-center justify-center"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-brand-green-50/80 dark:bg-white/5 border border-brand-green-100/60 flex items-center justify-center">
            <Wheat className="h-4 w-4 text-brand-green-600 dark:text-brand-green-300" />
          </div>
          <div className="text-sm font-semibold text-ink dark:text-white">AgroNexa LK</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden xs:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              {topbar.liveText}
            </span>
          </div>
          <button className="h-10 w-10 rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5" aria-label="Notifications">
            <Bell className="mx-auto h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute left-0 top-0 bottom-0 w-[86vw] max-w-330 bg-white dark:bg-black/60 backdrop-blur-18 border-r border-black/5 dark:border-white/10 overflow-y-auto">
            <SidebarNav role={roleFromHash()} user={userFromSession()} activeNav="Dashboard" onSwitchRole={onSwitchRole} />
          </div>
        </div>
      )}
    </div>
  )
}

function roleFromHash(): 'seller' | 'buyer' {
  const hash = window.location.hash.replace('#/', '')
  return hash === 'buyer' ? 'buyer' : 'seller'
}

function userFromSession() {
  // Fallback: app-level demo pages pass user; for drawer we can use minimal placeholders.
  return { avatarText: 'AN', name: 'AgroNexa', district: '—', badge: '—' }
}

