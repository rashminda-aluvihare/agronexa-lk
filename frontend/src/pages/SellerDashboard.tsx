import React from 'react'
import { GlassCard } from '../shared/ui/GlassCard'
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
              <h1 className="text-2xl sm:text-3xl font-bold text-ink dark:text-white">ආයුබෝවන්, {sellerDummy.profile.name}!</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                කෘෂිකාර්මික උපකරණ පුවරුව වෙත සාදරයෙන් පිළිගනිමු. (Welcome to your farming dashboard)
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 px-4 py-3 rounded-2xl">
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">ගිණුමේ තත්ත්වය (Account Status)</div>
                <div className="text-sm font-semibold text-brand-green-600 dark:text-brand-green-300">සක්‍රීයයි (Active)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Business Overview Card (Replaces Bulky Stat Cards) */}
        <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 p-6 shadow-soft">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">මගේ ව්‍යාපාරික දළ විශ්ලේෂණය (Business Overview)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/10">
            <div className="flex flex-col gap-1 pt-4 sm:pt-0">
              <span className="text-xs text-slate-500 uppercase font-medium tracking-wide">මේ මාසයේ ආදායම</span>
              <span className="text-3xl font-bold text-brand-green-600 dark:text-brand-green-400">රු. {sellerDummy.stats.earningsThisMonth.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500 mt-1">පසුගිය මාසයට වඩා 18% වැඩිවීමක්</span>
            </div>
            <div className="flex flex-col gap-1 pt-4 sm:pt-0 sm:pl-6 border-slate-100 dark:border-white/10">
              <span className="text-xs text-slate-500 uppercase font-medium tracking-wide">විකිණීමට ඇති බෝග</span>
              <span className="text-3xl font-bold text-ink dark:text-white">{sellerDummy.stats.activeListings}</span>
              <span className="text-[11px] text-slate-500 mt-1">මේ සතියේ අලුතින් 2ක්</span>
            </div>
            <div className="flex flex-col gap-1 pt-4 sm:pt-0 sm:pl-6 border-slate-100 dark:border-white/10">
              <span className="text-xs text-slate-500 uppercase font-medium tracking-wide">ලැබුණු ඉල්ලීම්</span>
              <span className="text-3xl font-bold text-brand-amber-600 dark:text-brand-amber-400">{sellerDummy.stats.pendingRequests}</span>
              <span className="text-[11px] text-slate-500 mt-1">පිළිතුරු දිය යුතුය</span>
            </div>
            <div className="flex flex-col gap-1 pt-4 sm:pt-0 sm:pl-6 border-slate-100 dark:border-white/10">
              <span className="text-xs text-slate-500 uppercase font-medium tracking-wide">කුලියට දුන් වාර</span>
              <span className="text-3xl font-bold text-ink dark:text-white">{sellerDummy.stats.completedRentals}</span>
              <span className="text-[11px] text-slate-500 mt-1">මේ මාසයේ 4ක්</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content: Urgent Actions & Quick Actions */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 flex flex-col gap-5">
            {/* Urgent Action Center */}
            <GlassCard title="අද දින ක්‍රියාමාර්ග (Urgent Tasks)" subtitle="ගැනුම්කරුවන්ගෙන් ලැබී ඇති නවතම ඉල්ලීම් සඳහා මෙතනින් පිළිතුරු දෙන්න">
              <div className="flex flex-col gap-3">
                {sellerDummy.requests.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl border border-brand-amber-100/50 bg-brand-amber-50/5 dark:bg-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-brand-amber-700 dark:text-brand-amber-300 bg-brand-amber-100 dark:bg-brand-amber-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">නව ඉල්ලීමක්</span>
                        <span className="text-xs text-slate-500">{req.date}</span>
                      </div>
                      <h4 className="font-bold text-ink dark:text-white mt-1.5">{req.cropName} ({req.buyerName} - {req.buyerDistrict})</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">යෝජිත මිල: රු. {req.offeredPricePerKg}/kg</p>
                    </div>
                    <button
                      onClick={() => alert(`${req.buyerName} ගේ ඉල්ලීමට පිළිතුරු යවන ලදී.`)}
                      className="self-start sm:self-center px-4 py-2 bg-brand-amber-600 hover:bg-brand-amber-700 text-white font-semibold text-xs rounded-xl transition-all"
                    >
                      පිළිතුරු දෙන්න
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard title="ඉක්මන් පියවර (Quick Actions)" subtitle="ඔබට අවශ්‍ය ප්‍රධාන කාර්යයන් පහසුවෙන් සිදු කරන්න">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => alert('අලුත් බෝගයක් එක් කිරීමට වම් පස ඇති "My Listings" පිටුව භාවිතා කරන්න.')}
                  className="flex flex-col p-5 rounded-2xl border border-brand-green-100/70 bg-brand-green-50/30 dark:bg-white/5 hover:bg-brand-green-500/10 transition-all text-left group"
                >
                  <span className="text-xs font-semibold text-brand-green-600 dark:text-brand-green-400 tracking-wide uppercase mb-1">බෝග විකිණීම</span>
                  <h3 className="font-semibold text-ink dark:text-white text-lg">බෝගයක් විකුණන්න</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">List a New Crop for Sale</p>
                </button>

                <button
                  onClick={() => alert('ඉල්ලීම් බැලීමට වම් පස ඇති "Buyer Requests" පිටුව භාවිතා කරන්න.')}
                  className="flex flex-col p-5 rounded-2xl border border-brand-amber-100/70 bg-brand-amber-50/30 dark:bg-white/5 hover:bg-brand-amber-500/10 transition-all text-left group"
                >
                  <span className="text-xs font-semibold text-brand-amber-600 dark:text-brand-amber-400 tracking-wide uppercase mb-1">මිලදී ගැනීමේ ඉල්ලීම්</span>
                  <h3 className="font-semibold text-ink dark:text-white text-lg">ගැනුම්කරුවන්ගේ ඉල්ලීම්</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">View Incoming Buyer Requests</p>
                </button>

                <button
                  onClick={() => alert('උපකරණ කළමනාකරණය සඳහා වම් පස ඇති "Equipment Rentals" පිටුව භාවිතා කරන්න.')}
                  className="flex flex-col p-5 rounded-2xl border border-brand-purple-100/70 bg-brand-purple-50/30 dark:bg-white/5 hover:bg-brand-purple-500/10 transition-all text-left group"
                >
                  <span className="text-xs font-semibold text-brand-purple-600 dark:text-brand-purple-400 tracking-wide uppercase mb-1">කුලී සේවා</span>
                  <h3 className="font-semibold text-ink dark:text-white text-lg">උපකරණ කුලියට දෙන්න</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Manage Equipment Rentals</p>
                </button>

                <button
                  onClick={() => alert('ගනුදෙනු ඉතිහාසය බැලීමට වම් පස ඇති "Ledger History" පිටුව භාවිතා කරන්න.')}
                  className="flex flex-col p-5 rounded-2xl border border-brand-blue-100/70 bg-brand-blue-50/30 dark:bg-white/5 hover:bg-brand-blue-500/10 transition-all text-left group"
                >
                  <span className="text-xs font-semibold text-brand-blue-600 dark:text-brand-blue-400 tracking-wide uppercase mb-1">ගිණුම් වාර්තා</span>
                  <h3 className="font-semibold text-ink dark:text-white text-lg">මගේ ගනුදෙනු විස්තර</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">View Transaction Ledger</p>
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
                  <div className="text-sm font-semibold text-brand-green-600 dark:text-brand-green-300 mt-2">විශිෂ්ට මට්ටමේ (Excellent)</div>
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

            <div className="rounded-3xl border border-brand-green-200/50 bg-brand-green-50/10 dark:bg-white/5 p-5">
              <div className="flex flex-col">
                <h4 className="font-bold text-brand-green-800 dark:text-brand-green-300 text-sm">බ්ලොක්චේන් මඟින් ආරක්ෂිතයි (Blockchain Secured)</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  ඔබේ සියලුම මුදල් ගනුදෙනු සහ කුලී ගිවිසුම් වෙනස් කළ නොහැකි ලෙස බ්ලොක්චේන් (Blockchain) ජාලය හරහා සුරක්ෂිතව සටහන් වේ.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SidebarLayout>
  )
}


