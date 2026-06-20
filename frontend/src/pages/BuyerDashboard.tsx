import React from 'react'
import { MessageSquareText, Tractor, Truck, User2 } from 'lucide-react'
import { SidebarLayout } from '../shared/layout/SidebarLayout'
import { GlassCard } from '../shared/ui/GlassCard'
import { StatCard } from '../shared/ui/StatCard'
import { buyerDummy } from '../data/buyerDummy'

export default function BuyerDashboard({ onSwitchRole }: { onSwitchRole: () => void }) {
  return (
    <SidebarLayout
      role="buyer"
      user={buyerDummy.profile}
      activeNav="Dashboard"
      onSwitchRole={onSwitchRole}
      topbar={{
        liveText: 'සජීවී (Live)',
        dateText: new Date('2026-05-08T00:00:00').toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        notificationsCount: 2,
      }}
    >
      <div className="flex flex-col gap-5">
        {/* Welcome Section */}
        <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-gradient-to-r from-brand-teal-500/10 to-brand-green-500/5 dark:from-brand-teal-500/5 dark:to-transparent p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-ink dark:text-white">ආයුබෝවන්, {buyerDummy.profile.name}! 🛒</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                ගැනුම්කරුගේ උපකරණ පුවරුව වෙත සාදරයෙන් පිළිගනිමු. (Welcome to your buyer dashboard)
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 px-4 py-3 rounded-2xl">
              <span className="text-xl" aria-hidden="true">👤</span>
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">ගිණුමේ තත්ත්වය (Account Status)</div>
                <div className="text-sm font-semibold text-brand-teal-600 dark:text-brand-teal-300">සක්‍රීය ගැනුම්කරු (Active Buyer)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            tone="teal"
            icon={<Tractor className="h-5 w-5" />}
            value={buyerDummy.stats.activeRequests}
            label="මගේ ඉල්ලීම් (Active Requests)"
            footer="පිළිතුරු ලැබෙමින් පවතී"
          />
          <StatCard
            tone="amber"
            icon={<MessageSquareText className="h-5 w-5" />}
            value={buyerDummy.stats.newResponses}
            label="ලැබුණු පිළිතුරු (Seller Responses)"
            footer="විකුණුම්කරුවන්ගෙන් ලැබුණි"
          />
          <StatCard
            tone="green"
            icon={<User2 className="h-5 w-5" />}
            value={buyerDummy.stats.confirmedBookings}
            label="තහවුරු කළ වෙන් කිරීම් (Confirmed Bookings)"
            footer="මේ සතියේ 1ක්"
          />
          <StatCard
            tone="purple"
            icon={<Truck className="h-5 w-5" />}
            value={buyerDummy.stats.pastPurchases}
            label="මුළු මිලදී ගැනීම් (Total Purchases)"
            footer="සම්පූර්ණ"
          />
        </section>

        {/* Dashboard Content: Simple Quick Actions & Alerts */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 flex flex-col gap-4">
            <GlassCard title="ඉක්මන් පියවර (Quick Actions)" subtitle="ඔබට අවශ්‍ය ප්‍රධාන කාර්යයන් පහසුවෙන් සිදු කරන්න">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => alert('බෝග මිලදී ගැනීමට සහ වෙළඳපොළ බැලීමට වම් පස ඇති "Marketplace" පිටුව භාවිතා කරන්න.')}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-brand-teal-100/70 bg-brand-teal-50/40 dark:bg-white/5 hover:bg-brand-teal-500/10 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-brand-teal-500 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                    🛍️
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink dark:text-white">වෙළඳපොළට යන්න</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Go to Crop Marketplace</p>
                  </div>
                </button>

                <button
                  onClick={() => alert('අලුත් ඉල්ලීමක් කිරීමට වම් පස ඇති "My Requests" පිටුව භාවිතා කරන්න.')}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-brand-green-100/70 bg-brand-green-50/40 dark:bg-white/5 hover:bg-brand-green-500/10 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-brand-green-500 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                    📝
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink dark:text-white">අලුත් ඉල්ලීමක් කරන්න</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Post a New Crop Request</p>
                  </div>
                </button>

                <button
                  onClick={() => alert('ප්‍රවාහන සහ කෘෂිකාර්මික උපකරණ වෙන් කිරීමට වම් පස ඇති "My Bookings" පිටුව භාවිතා කරන්න.')}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-brand-purple-100/70 bg-brand-purple-50/40 dark:bg-white/5 hover:bg-brand-purple-500/10 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-brand-purple-500 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                    🚛
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink dark:text-white">ප්‍රවාහන / උපකරණ කුලියට ගන්න</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Rent Vehicles or Equipment</p>
                  </div>
                </button>

                <button
                  onClick={() => alert('පණිවිඩ කියවීමට සහ යැවීමට වම් පස ඇති "Messages" පිටුව භාවිතා කරන්න.')}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-brand-blue-100/70 bg-brand-blue-50/40 dark:bg-white/5 hover:bg-brand-blue-500/10 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-brand-blue-500 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                    💬
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink dark:text-white">මගේ පණිවිඩ (Messages)</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Read Chat Conversations</p>
                  </div>
                </button>
              </div>
            </GlassCard>
          </div>

          {/* Sidebar alert box */}
          <div className="flex flex-col gap-4">
            <GlassCard title="නවතම දැනුම්දීම් (Recent Updates)">
              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-brand-teal-100 bg-brand-teal-50/30 dark:bg-white/5">
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold mb-1">නව පිළිතුරක් ඇත</div>
                  <div className="text-sm font-semibold text-brand-teal-700 dark:text-brand-teal-300">
                    Sunil K. විසින් තක්කාලි 80kg සඳහා පිළිතුරක් එවා ඇත.
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">පෙරවරු 10:24 · May 10</div>
                </div>

                <div className="p-4 rounded-2xl border border-brand-green-100 bg-brand-green-50/30 dark:bg-white/5">
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold mb-1">කුලියට ගැනීම තහවුරුයි</div>
                  <div className="text-sm font-semibold text-brand-green-700 dark:text-brand-green-300">
                    Kubota Mini Tractor වෙන් කිරීම නියමිත පරිදි තහවුරු කර ඇත.
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">ඊයේ · May 9</div>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </SidebarLayout>
  )
}



