import React from 'react'
import { SidebarLayout } from '../shared/layout/SidebarLayout'
import { GlassCard } from '../shared/ui/GlassCard'
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
              <h1 className="text-2xl sm:text-3xl font-bold text-ink dark:text-white">ආයුබෝවන්, {buyerDummy.profile.name}!</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                ගැනුම්කරුගේ උපකරණ පුවරුව වෙත සාදරයෙන් පිළිගනිමු. (Welcome to your buyer dashboard)
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 px-4 py-3 rounded-2xl">
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">ගිණුමේ තත්ත්වය (Account Status)</div>
                <div className="text-sm font-semibold text-brand-teal-600 dark:text-brand-teal-300">සක්‍රීය ගැනුම්කරු (Active Buyer)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Purchases Overview Card (Replaces Bulky Stat Cards) */}
        <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 p-6 shadow-soft">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">මගේ මිලදී ගැනීම් දළ විශ්ලේෂණය (Purchases Overview)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/10">
            <div className="flex flex-col gap-1 pt-4 sm:pt-0">
              <span className="text-xs text-slate-500 uppercase font-medium tracking-wide">මගේ සක්‍රීය ඉල්ලීම්</span>
              <span className="text-3xl font-bold text-brand-teal-600 dark:text-brand-teal-400">{buyerDummy.stats.activeRequests}</span>
              <span className="text-[11px] text-slate-500 mt-1">පිළිතුරු ලැබෙමින් පවතී</span>
            </div>
            <div className="flex flex-col gap-1 pt-4 sm:pt-0 sm:pl-6 border-slate-100 dark:divide-white/10">
              <span className="text-xs text-slate-500 uppercase font-medium tracking-wide">ලැබුණු පිළිතුරු</span>
              <span className="text-3xl font-bold text-brand-amber-600 dark:text-brand-amber-400">{buyerDummy.stats.newResponses}</span>
              <span className="text-[11px] text-slate-500 mt-1">විකුණුම්කරුවන්ගෙන් ලැබුණි</span>
            </div>
            <div className="flex flex-col gap-1 pt-4 sm:pt-0 sm:pl-6 border-slate-100 dark:divide-white/10">
              <span className="text-xs text-slate-500 uppercase font-medium tracking-wide">තහවුරු කළ වෙන් කිරීම්</span>
              <span className="text-3xl font-bold text-brand-green-600 dark:text-brand-green-400">{buyerDummy.stats.confirmedBookings}</span>
              <span className="text-[11px] text-slate-500 mt-1">මේ සතියේ 1ක්</span>
            </div>
            <div className="flex flex-col gap-1 pt-4 sm:pt-0 sm:pl-6 border-slate-100 dark:divide-white/10">
              <span className="text-xs text-slate-500 uppercase font-medium tracking-wide">මුළු මිලදී ගැනීම්</span>
              <span className="text-3xl font-bold text-ink dark:text-white">{buyerDummy.stats.pastPurchases}</span>
              <span className="text-[11px] text-slate-500 mt-1">සම්පූර්ණයි</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content: Order Status Tracker & Quick Actions */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 flex flex-col gap-5">
            {/* Order Status Tracker */}
            <GlassCard title="ඇණවුම් සහ වෙන්කිරීම් තත්ත්වය (Active Order Tracker)" subtitle="ඔබ වෙන් කරගත් උපකරණ සහ ප්‍රවාහන සේවාවල වත්මන් ප්‍රගතිය">
              <div className="flex flex-col gap-4">
                {buyerDummy.bookings.slice(0, 3).map((booking) => {
                  const steps = ['වෙන් කිරීම', 'තහවුරු කිරීම', 'ප්‍රවාහනයේ', 'නිමයි']
                  const activeStep =
                    booking.status === 'Confirmed'
                      ? 1
                      : booking.status === 'Pending'
                        ? 0
                        : booking.status === 'Rejected'
                          ? -1
                          : 3

                  return (
                    <div key={booking.id} className="p-5 rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-3">
                        <div>
                          <h4 className="font-bold text-ink dark:text-white text-sm">{booking.equipmentName}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">අයිතිකරු: {booking.ownerName} · {booking.ownerDistrict}</p>
                        </div>
                        <div className="text-left sm:text-right text-xs">
                          <span className="text-slate-500">කාලය: </span>
                          <span className="font-semibold text-ink dark:text-white">{booking.duration}</span>
                          <div className="text-brand-teal-600 dark:text-brand-teal-400 font-bold mt-0.5">රු. {booking.price.toLocaleString()}</div>
                        </div>
                      </div>

                      {activeStep === -1 ? (
                        <div className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl">
                          මෙම ඇණවුම ප්‍රතික්ෂේප කර ඇත (Rejected / Cancelled)
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 pt-1 text-[10px] sm:text-xs">
                          {steps.map((step, idx) => {
                            const isPassed = idx <= activeStep
                            const isCurrent = idx === activeStep
                            return (
                              <div key={step} className="flex flex-col gap-2 text-center">
                                <div className={`h-1.5 rounded-full ${
                                  isCurrent
                                    ? 'bg-brand-teal-600 animate-pulse'
                                    : isPassed
                                      ? 'bg-brand-teal-500'
                                      : 'bg-black/5 dark:bg-white/10'
                                }`} />
                                <span className={`font-medium ${
                                  isCurrent
                                    ? 'text-brand-teal-600 dark:text-brand-teal-400 font-bold'
                                    : isPassed
                                      ? 'text-ink dark:text-white'
                                      : 'text-slate-400 dark:text-slate-500'
                                }`}>
                                  {step}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard title="ඉක්මන් පියවර (Quick Actions)" subtitle="ඔබට අවශ්‍ය ප්‍රධාන කාර්යයන් පහසුවෙන් සිදු කරන්න">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => alert('බෝග මිලදී ගැනීමට සහ වෙළඳපොළ බැලීමට වම් පස ඇති "Marketplace" පිටුව භාවිතා කරන්න.')}
                  className="flex flex-col p-5 rounded-2xl border border-brand-teal-100/70 bg-brand-teal-50/30 dark:bg-white/5 hover:bg-brand-teal-500/10 transition-all text-left group"
                >
                  <span className="text-xs font-semibold text-brand-teal-600 dark:text-brand-teal-400 tracking-wide uppercase mb-1">බෝග වෙළඳපොළ</span>
                  <h3 className="font-semibold text-ink dark:text-white text-lg">වෙළඳපොළට යන්න</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Go to Crop Marketplace</p>
                </button>

                <button
                  onClick={() => alert('අලුත් ඉල්ලීමක් කිරීමට වම් පස ඇති "My Requests" පිටුව භාවිතා කරන්න.')}
                  className="flex flex-col p-5 rounded-2xl border border-brand-green-100/70 bg-brand-green-50/30 dark:bg-white/5 hover:bg-brand-green-500/10 transition-all text-left group"
                >
                  <span className="text-xs font-semibold text-brand-green-600 dark:text-brand-green-400 tracking-wide uppercase mb-1">මිලදී ගැනීමේ ඉල්ලීමක්</span>
                  <h3 className="font-semibold text-ink dark:text-white text-lg">අලුත් ඉල්ලීමක් කරන්න</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Post a New Crop Request</p>
                </button>

                <button
                  onClick={() => alert('ප්‍රවාහන සහ කෘෂිකාර්මික උපකරණ වෙන් කිරීමට වම් පස ඇති "My Bookings" පිටුව භාවිතා කරන්න.')}
                  className="flex flex-col p-5 rounded-2xl border border-brand-purple-100/70 bg-brand-purple-50/30 dark:bg-white/5 hover:bg-brand-purple-500/10 transition-all text-left group"
                >
                  <span className="text-xs font-semibold text-brand-purple-600 dark:text-brand-purple-400 tracking-wide uppercase mb-1">ප්‍රවාහන සහ උපකරණ</span>
                  <h3 className="font-semibold text-ink dark:text-white text-lg">කුලී සේවා ලබාගන්න</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Rent Vehicles or Equipment</p>
                </button>

                <button
                  onClick={() => alert('පණිවිඩ කියවීමට සහ යැවීමට වම් පස ඇති "Messages" පිටුව භාවිතා කරන්න.')}
                  className="flex flex-col p-5 rounded-2xl border border-brand-blue-100/70 bg-brand-blue-50/30 dark:bg-white/5 hover:bg-brand-blue-500/10 transition-all text-left group"
                >
                  <span className="text-xs font-semibold text-brand-blue-600 dark:text-brand-blue-400 tracking-wide uppercase mb-1">පණිවිඩ හුවමාරුව</span>
                  <h3 className="font-semibold text-ink dark:text-white text-lg">මගේ පණිවිඩ (Messages)</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Read Chat Conversations</p>
                </button>
              </div>
            </GlassCard>
          </div>

          {/* Sidebar alert box */}
          <div className="flex flex-col gap-4">
            <GlassCard title="වෙළඳපොළේ නවතම බෝග (Marketplace)" subtitle="ඔබේ ප්‍රදේශය අවට විකිණීමට ඇති බෝග වර්ග">
              <div className="flex flex-col gap-3">
                {buyerDummy.marketplace.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-ink dark:text-white text-sm">{item.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">ප්‍රදේශය: {item.district} · තොගය: {item.availableStock}kg</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-brand-teal-600 dark:text-brand-teal-400">රු. {item.pricePerKg}/kg</div>
                      <button
                        onClick={() => alert(`${item.name} මිලදී ගැනීම සඳහා විමසීමක් යවන ලදී.`)}
                        className="mt-1.5 px-3 py-1 bg-brand-teal-600 hover:bg-brand-teal-700 text-white font-semibold text-[10px] rounded-lg transition-all"
                      >
                        මිලදී ගන්න
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </SidebarLayout>
  )
}



