import React from 'react'
import {
  Boxes,
  ChartNoAxesCombined,
  CircleDollarSign,
  LogOut,
  MessageSquare,
  Receipt,
  Settings,
  Sparkles,
  Truck,
  Wheat,
  Wrench,
} from 'lucide-react'
import { SidebarUser } from './SidebarLayout'
import { NavItem } from './NavItem'

export function SidebarNav({ role, user, activeNav, onSwitchRole }: { role: 'seller' | 'buyer'; user: SidebarUser; activeNav: string; onSwitchRole: () => void }) {
  const seller = [
    { label: 'Dashboard', icon: <ChartNoAxesCombined className="h-4 w-4" />, badge: null },
    { label: 'My Listings', icon: <Wheat className="h-4 w-4" />, badge: '6' },
    { label: 'Buyer Requests', icon: <MessageSquare className="h-4 w-4" />, badge: '3' },
    { label: 'Equipment Rentals', icon: <Wrench className="h-4 w-4" />, badge: null },
  ]
  const buyer = [
    { label: 'Dashboard', icon: <ChartNoAxesCombined className="h-4 w-4" />, badge: null },
    { label: 'Marketplace', icon: <Boxes className="h-4 w-4" />, badge: null },
    { label: 'My Requests', icon: <Receipt className="h-4 w-4" />, badge: '2' },
    { label: 'My Bookings', icon: <Truck className="h-4 w-4" />, badge: '3' },
  ]

  const accountSeller = [
    { label: 'Ledger History', icon: <CircleDollarSign className="h-4 w-4" />, badge: null },
    { label: 'Profile', icon: <Sparkles className="h-4 w-4" />, badge: null },
    { label: 'Settings', icon: <Settings className="h-4 w-4" />, badge: null },
  ]
  const accountBuyer = [
    { label: 'Messages', icon: <MessageSquare className="h-4 w-4" />, badge: '5' },
    { label: 'Profile', icon: <Sparkles className="h-4 w-4" />, badge: null },
    { label: 'Settings', icon: <Settings className="h-4 w-4" />, badge: null },
  ]

  return (
    <aside className="h-full flex flex-col bg-gradient-to-b from-white/80 to-white/50 dark:from-white/5 dark:to-black/30 backdrop-blur-18 border-r border-black/5 dark:border-white/10 shadow-soft">
      <div className="px-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-brand-green-50/80 dark:bg-white/5 border border-brand-green-100/60 flex items-center justify-center">
            <Wheat className="h-5 w-5 text-brand-green-600 dark:text-brand-green-300" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink dark:text-white">AgroNexa LK</div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300">Smart Farming Marketplace</div>
          </div>
        </div>
      </div>

      <div className="mt-6 mx-4 p-4 rounded-3xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-3xl bg-brand-teal-50/80 dark:bg-white/5 border border-brand-teal-100/60 flex items-center justify-center text-sm font-bold text-brand-teal-700 dark:text-brand-teal-300">
            {user.avatarText}
          </div>
          <div>
            <div className="font-semibold text-ink dark:text-white">{user.name}</div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">{user.district}</div>
            <div className="mt-2 inline-flex items-center rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 border border-black/5 dark:border-white/10">
              {user.badge}
            </div>
          </div>
        </div>
      </div>

      <nav className="mt-6 px-4 pb-4 overflow-y-auto">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 mb-2">Main</div>
        <div className="space-y-1">
          {(role === 'seller' ? seller : buyer).map((i) => (
            <NavItem key={i.label} label={i.label} icon={i.icon} badge={i.badge} active={i.label === activeNav} />
          ))}
        </div>

        <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 mt-6 mb-2">Account</div>
        <div className="space-y-1">
          {(role === 'seller' ? accountSeller : accountBuyer).map((i) => (
            <NavItem key={i.label} label={i.label} icon={i.icon} badge={i.badge} active={i.label === activeNav} />
          ))}
        </div>

        <div className="mt-6">
          <button
            type="button"
            className="w-full rounded-3xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 px-4 py-3 flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-white/10 transition-all"
            onClick={onSwitchRole}
          >
            <span className="text-lg" aria-hidden>
              {role === 'seller' ? '🛒' : '🌾'}
            </span>
            Switch to {role === 'seller' ? 'Buyer' : 'Seller'}
          </button>
        </div>
      </nav>

      <div className="mt-auto px-6 pb-6">
        <button
          type="button"
          className="w-full rounded-3xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 px-4 py-3 flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-white/10 transition-all"
          onClick={() => alert('Logout (demo)')}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}

