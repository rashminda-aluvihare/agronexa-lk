import React from 'react'
import { Bell, Calendar, ShieldCheck, Sparkles, Wallet, Wheat } from 'lucide-react'
import { GlassCard } from '../shared/ui/GlassCard'
import { StatCard } from '../shared/ui/StatCard'
import { SidebarLayout } from '../shared/layout/SidebarLayout'
import { sellerDummy } from '../data/sellerDummy'

export default function SellerDashboard({ onSwitchRole }: { onSwitchRole: () => void }) {
  return (
    <SidebarLayout
      role="seller"
      user={sellerDummy.profile}
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
        notificationsCount: 3,
      }}
    >
      <div className="flex flex-col gap-5">
        {/* Welcome Section */}
        <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-gradient-to-r from-brand-green-500/10 to-brand-teal-500/5 dark:from-brand-green-500/5 dark:to-transparent p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-ink dark:text-white">ආයුබෝවන්, {sellerDummy.profile.name}! 🌾</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                කෘෂිකාර්මික උපකරණ පුවරුව වෙත සාදරයෙන් පිළිගනිමු. (Welcome to your farming dashboard)
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 px-4 py-3 rounded-2xl">
              <ShieldCheck className="h-5 w-5 text-brand-green-600 dark:text-brand-green-300" />
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">ගිණුමේ තත්ත්වය (Account Status)</div>
                <div className="text-sm font-semibold text-brand-green-600 dark:text-brand-green-300">සක්‍රීයයි (Active)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            tone="green"
            icon={<Wheat className="h-5 w-5" />}
            value={sellerDummy.stats.activeListings}
            label="විකිණීමට ඇති බෝග (Crops for Sale)"
            footer="මේ සතියේ අලුතින් 2ක්"
          />
          <StatCard
            tone="amber"
            icon={<Bell className="h-5 w-5" />}
            value={sellerDummy.stats.pendingRequests}
            label="ගැනුම්කරුවන්ගේ ඉල්ලීම් (Pending Requests)"
            footer="පිළිතුරු දිය යුතුය"
          />
          <StatCard
            tone="blue"
            icon={<Wallet className="h-5 w-5" />}
            value={`රු. ${sellerDummy.stats.earningsThisMonth.toLocaleString()}`}
            label="මේ මාසයේ ආදායම (Monthly Earnings)"
            footer="පසුගිය මාසයට වඩා 18% වැඩිවීමක්"
          />
          <StatCard
            tone="purple"
            icon={<Sparkles className="h-5 w-5" />}
            value={sellerDummy.stats.completedRentals}
            label="කුලියට දුන් වාර (Completed Rentals)"
            footer="මේ මාසයේ 4ක්"
          />
        </section>

        {/* Dashboard Content: Simple Quick Actions & Profile Ratings */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 flex flex-col gap-4">
            <GlassCard title="ඉක්මන් පියවර (Quick Actions)" subtitle="ඔබට අවශ්‍ය ප්‍රධාන කාර්යයන් පහසුවෙන් සිදු කරන්න">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => alert('අලුත් බෝගයක් එක් කිරීමට වම් පස ඇති "My Listings" පිටුව භාවිතා කරන්න.')}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-brand-green-100/70 bg-brand-green-50/40 dark:bg-white/5 hover:bg-brand-green-500/10 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-brand-green-500 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                    🌾
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink dark:text-white">බෝගයක් විකිණීමට දමන්න</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">+ List a New Crop for Sale</p>
                  </div>
                </button>

                <button
                  onClick={() => alert('ඉල්ලීම් බැලීමට වම් පස ඇති "Buyer Requests" පිටුව භාවිතා කරන්න.')}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-brand-amber-100/70 bg-brand-amber-50/40 dark:bg-white/5 hover:bg-brand-amber-500/10 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-brand-amber-500 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                    💬
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink dark:text-white">ගැනුම්කරුවන්ගේ ඉල්ලීම්</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">View Incoming Buyer Requests</p>
                  </div>
                </button>

                <button
                  onClick={() => alert('උපකරණ කළමනාකරණය සඳහා වම් පස ඇති "Equipment Rentals" පිටුව භාවිතා කරන්න.')}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-brand-purple-100/70 bg-brand-purple-50/40 dark:bg-white/5 hover:bg-brand-purple-500/10 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-brand-purple-500 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                    🚜
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink dark:text-white">උපකරණ කුලියට දෙන්න</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Manage Equipment Rentals</p>
                  </div>
                </button>

                <button
                  onClick={() => alert('ගනුදෙනු ඉතිහාසය බැලීමට වම් පස ඇති "Ledger History" පිටුව භාවිතා කරන්න.')}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-brand-blue-100/70 bg-brand-blue-50/40 dark:bg-white/5 hover:bg-brand-blue-500/10 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-brand-blue-500 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                    💸
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink dark:text-white">මගේ ගනුදෙනු විස්තර</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">View Transaction Ledger</p>
                  </div>
                </button>
              </div>
            </GlassCard>
          </div>

          {/* Sidebar Panel for Rating & Verification details */}
          <div className="flex flex-col gap-4">
            <GlassCard title="ඔබේ ශ්‍රේණිගත කිරීම (Rating)" subtitle="ගැනුම්කරුවන්ගේ ප්‍රතිපෝෂණ මත පදනම්ව">
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-5xl font-semibold text-brand-green-600">{sellerDummy.reputation.score.toFixed(1)}</div>
                  <div className="text-sm font-semibold text-brand-green-600 dark:text-brand-green-300 mt-2">විශිෂ්ට මට්ටමේ (Excellent) ⭐</div>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>විශ්වාසවන්තභාවය (Reliability)</span>
                    <span className="font-semibold">{sellerDummy.reputation.reliability}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-green-500" style={{ width: `${sellerDummy.reputation.reliability}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>වේලාවට වැඩ කිරීම (Timeliness)</span>
                    <span className="font-semibold">{sellerDummy.reputation.timeliness}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-amber-500" style={{ width: `${sellerDummy.reputation.timeliness}%` }} />
                  </div>
                </div>
              </div>
            </GlassCard>

            <div className="rounded-3xl border border-brand-green-200 bg-brand-green-50/30 dark:bg-white/5 p-5">
              <div className="flex gap-3">
                <span className="text-2xl" aria-hidden="true">🛡️</span>
                <div>
                  <h4 className="font-bold text-brand-green-800 dark:text-brand-green-300 text-sm">බ්ලොක්චේන් මඟින් ආරක්ෂිතයි</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    ඔබේ සියලුම මුදල් ගනුදෙනු සහ කුලී ගිවිසුම් වෙනස් කළ නොහැකි ලෙස බ්ලොක්චේන් (Blockchain) ජාලය හරහා සුරක්ෂිතව සටහන් වේ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SidebarLayout>
  )
}


