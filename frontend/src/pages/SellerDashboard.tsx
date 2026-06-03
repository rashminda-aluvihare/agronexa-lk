import React from 'react'
import { Bell, Calendar, ShieldCheck, Sparkles, Wallet, Wheat } from 'lucide-react'
import { MonthlyEarningsChart } from '../shared/charts/MonthlyEarningsChart'
import { GlassCard } from '../shared/ui/GlassCard'
import { StatCard } from '../shared/ui/StatCard'
import { SidebarLayout } from '../shared/layout/SidebarLayout'
import { sellerDummy } from '../data/sellerDummy'
import { Badge } from '../shared/ui/Badge'

export default function SellerDashboard({ onSwitchRole }: { onSwitchRole: () => void }) {
  return (
    <SidebarLayout
      role="seller"
      user={sellerDummy.profile}
      activeNav="Dashboard"
      onSwitchRole={onSwitchRole}
      topbar={{
        liveText: 'Live',
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
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            tone="green"
            icon={<Wheat className="h-5 w-5" />}
            value={sellerDummy.stats.activeListings}
            label="Active Listings"
            footer="↑ 2 this week"
          />
          <StatCard
            tone="amber"
            icon={<Bell className="h-5 w-5" />}
            value={sellerDummy.stats.pendingRequests}
            label="Pending Buyer Requests"
            footer="Needs response"
          />
          <StatCard
            tone="blue"
            icon={<Wallet className="h-5 w-5" />}
            value={`Rs. ${sellerDummy.stats.earningsThisMonth.toLocaleString()}`}
            label="Earnings This Month"
            footer="↑ 18% vs last month"
          />
          <StatCard
            tone="purple"
            icon={<Sparkles className="h-5 w-5" />}
            value={sellerDummy.stats.completedRentals}
            label="Completed Rentals"
            footer="↑ 4 this month"
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 flex flex-col gap-4">
            <GlassCard title="My Crop Listings" subtitle="Manage your available produce" actionLabel="+ Add New">
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {sellerDummy.cropListings.map((l) => (
                  <div
                    key={l.id}
                    className="py-3 flex items-center gap-3 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors rounded-xl px-2 -mx-2"
                  >
                    <div className="h-11 w-11 rounded-2xl glass-border bg-white/60 dark:bg-white/5 flex items-center justify-center shadow-sm">
                      <span className="text-xl" aria-hidden>
                        {l.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink dark:text-white truncate">{l.name}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                        {l.district} · {l.availableQty} kg available
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Listed {l.listedAgo}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-brand-green-500">Rs. {l.pricePerKg}/kg</div>
                      <div className="mt-2 flex justify-end">
                        <Badge tone={l.status === 'Active' ? 'green' : 'amber'}>{l.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard title="Incoming Buyer Requests" subtitle="Accept, counter-offer, or decline" actionLabel={`${sellerDummy.requests.length} new`}>
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {sellerDummy.requests.map((r) => (
                  <div key={r.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-ink dark:text-white truncate">{r.cropName}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">Buyer: {r.buyerName} · {r.buyerDistrict}</div>
                      </div>
                      <Badge tone="amber">{r.statusLabel}</Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{r.date}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-start sm:justify-end">
                        <span className="text-brand-amber-500 font-semibold">Rs. {r.offeredPricePerKg}/kg</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="px-3 py-2 rounded-xl bg-brand-green-500 text-white font-semibold text-sm hover:bg-brand-green-600 transition-all">
                        Accept
                      </button>
                      <button className="px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 text-ink dark:text-white font-semibold text-sm hover:bg-white/80 dark:hover:bg-white/10 transition-all">
                        Counter Offer
                      </button>
                      <button className="px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-red-200/60 dark:border-red-400/20 text-red-600 dark:text-red-300 font-semibold text-sm hover:bg-red-50/70 dark:hover:bg-red-950/20 transition-all">
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="flex flex-col gap-4">
            <GlassCard
              title="Blockchain Ledger"
              subtitle="Recent rental/service transactions"
              actionLabel="View all"
            >
              <div className="space-y-3">
                {sellerDummy.ledgerRecent.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors">
                    <div className="h-10 w-10 rounded-2xl bg-brand-green-50 dark:bg-white/5 border border-brand-green-100 dark:border-white/10 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-brand-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink dark:text-white truncate">{tx.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{tx.hashPreview}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-brand-green-500">Rs. {tx.amount.toLocaleString()}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tx.when}</div>
                    </div>
                  </div>
                ))}

                <div className="mt-3 rounded-2xl border border-brand-green-200/70 dark:border-white/10 bg-brand-green-50/60 dark:bg-white/5 p-3 flex items-start gap-2">
                  <div className="mt-0.5">
                    <ShieldCheck className="h-5 w-5 text-brand-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-brand-green-700 dark:text-brand-green-300">Chain verified — No tampering detected</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">Integrity checks completed for latest entries.</div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard title="Seller Reputation Panel" subtitle="Based on verified rentals">
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-5xl font-semibold text-brand-green-600">{sellerDummy.reputation.score.toFixed(1)}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">Rating score</div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>Reliability</span>
                    <span className="font-semibold">{sellerDummy.reputation.reliability}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-green-500" style={{ width: `${sellerDummy.reputation.reliability}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>Timeliness</span>
                    <span className="font-semibold">{sellerDummy.reputation.timeliness}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-amber-500" style={{ width: `${sellerDummy.reputation.timeliness}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>Accuracy</span>
                    <span className="font-semibold">{sellerDummy.reputation.accuracy}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-blue-500" style={{ width: `${sellerDummy.reputation.accuracy}%` }} />
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard title="Monthly Earnings" subtitle="Last 5 months income">
              <MonthlyEarningsChart />
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Rs. {sellerDummy.earnings.lastMonthTotal.toLocaleString()} earned in {sellerDummy.earnings.lastMonthLabel}
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </SidebarLayout>
  )
}

