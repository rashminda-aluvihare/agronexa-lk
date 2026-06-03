import React from 'react'
import { ChevronRight, MessageSquareText, Send, Tractor, Truck, User2 } from 'lucide-react'
import { SidebarLayout } from '../shared/layout/SidebarLayout'
import { GlassCard } from '../shared/ui/GlassCard'
import { StatCard } from '../shared/ui/StatCard'
import { Badge } from '../shared/ui/Badge'
import { buyerDummy } from '../data/buyerDummy'

const districtBg = 'bg-brand-teal-50/70 dark:bg-white/5'

export default function BuyerDashboard({ onSwitchRole }: { onSwitchRole: () => void }) {
  return (
    <SidebarLayout
      role="buyer"
      user={buyerDummy.profile}
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
        notificationsCount: 2,
      }}
    >
      <div className="flex flex-col gap-5">
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            tone="teal"
            icon={<Tractor className="h-5 w-5" />}
            value={buyerDummy.stats.activeRequests}
            label="Active Requests"
            footer="Awaiting seller response"
          />
          <StatCard
            tone="amber"
            icon={<MessageSquareText className="h-5 w-5" />}
            value={buyerDummy.stats.newResponses}
            label="New Responses"
            footer="From sellers"
          />
          <StatCard
            tone="green"
            icon={<User2 className="h-5 w-5" />}
            value={buyerDummy.stats.confirmedBookings}
            label="Confirmed Bookings"
            footer="↑ 1 this week"
          />
          <StatCard
            tone="purple"
            icon={<Truck className="h-5 w-5" />}
            value={buyerDummy.stats.pastPurchases}
            label="Past Purchases"
            footer="Lifetime"
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 flex flex-col gap-4">
            <GlassCard
              title="Broadcast Buyer Request Form"
              subtitle="Send your request to all matching sellers"
              actionLabel={null}
            >
              <div className={`rounded-2xl border border-brand-teal-100/70 ${districtBg} p-4`}>
                <div className="text-sm font-semibold text-brand-teal-700 dark:text-brand-teal-300">
                  Requests expire after 72 hours if no response is accepted
                </div>
              </div>

              <form className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Commodity</span>
                    <input
                      className="h-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 px-3 focus:outline-none focus:ring-2 focus:ring-brand-teal-500/40"
                      placeholder="Tomatoes, Carrots..."
                      defaultValue="Tomatoes"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Quantity (kg)</span>
                    <input
                      type="number"
                      className="h-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 px-3 focus:outline-none focus:ring-2 focus:ring-brand-teal-500/40"
                      placeholder="e.g. 50"
                      defaultValue={buyerDummy.form.quantityKg}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Required Date</span>
                    <input
                      type="date"
                      className="h-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 px-3 focus:outline-none focus:ring-2 focus:ring-brand-teal-500/40"
                      defaultValue={buyerDummy.form.requiredDate}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Buyer Location</span>
                    <input
                      className="h-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 px-3 focus:outline-none focus:ring-2 focus:ring-brand-teal-500/40"
                      placeholder="District"
                      defaultValue={buyerDummy.form.locationDistrict}
                    />
                  </label>
                  <label className="flex flex-col gap-2 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Price Offer (Rs./kg)</span>
                    <input
                      type="number"
                      className="h-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 px-3 focus:outline-none focus:ring-2 focus:ring-brand-teal-500/40"
                      placeholder="Leave blank for open offer"
                      defaultValue={buyerDummy.form.priceOfferPerKg ?? ''}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="mt-4 w-full h-12 rounded-2xl bg-brand-teal-500 text-white font-semibold shadow-soft hover:bg-brand-teal-600 transition-all"
                  aria-label="Broadcast request"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Send className="h-5 w-5" />
                    Broadcast to Sellers
                  </span>
                </button>
              </form>
            </GlassCard>

            <GlassCard title="Seller Responses" subtitle="Negotiation updates" actionLabel={`${buyerDummy.responses.length} new`}>
              <div className="space-y-3">
                {buyerDummy.responses.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-4 ${
                      m.kind === 'highlight'
                        ? 'border-brand-teal-200/70 bg-brand-teal-50/70 dark:bg-white/5'
                        : 'border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-ink dark:text-white">{m.sellerName}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{m.sellerDistrict}</div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{m.deliveryDate}</div>
                    </div>

                    <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-semibold">Offer:</span> {m.details}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="px-3 py-2 rounded-xl bg-brand-teal-500 text-white font-semibold text-sm hover:bg-brand-teal-600 transition-all">
                        Confirm
                      </button>
                      <button className="px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 text-ink dark:text-white font-semibold text-sm hover:bg-white/80 dark:hover:bg-white/10 transition-all">
                        Accept Counter
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
            <GlassCard title="Equipment Bookings" subtitle="Your rental status" actionLabel="View all">
              <div className="space-y-3">
                {buyerDummy.bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-start gap-3 rounded-2xl p-3 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-black/[0.02] dark:hover:bg-white/10 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-2xl bg-brand-teal-50/80 dark:bg-white/5 flex items-center justify-center">
                      <span className="text-lg" aria-hidden>
                        {b.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink dark:text-white truncate">{b.equipmentName}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">Owner: {b.ownerName} · {b.ownerDistrict}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap gap-x-4">
                        <span>{b.duration}</span>
                        <span className="font-semibold">Rs. {b.price.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mt-1">
                      <Badge tone={b.status === 'Confirmed' ? 'green' : b.status === 'Pending' ? 'amber' : 'red'}>{b.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard title="Browse Marketplace" subtitle="Express Interest to start negotiation" actionLabel="View all listings">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {buyerDummy.marketplace.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 hover:-translate-y-0.5 transition-transform duration-200"
                  >
                    <div className="h-24 rounded-2xl bg-brand-teal-50/80 dark:bg-white/5 flex items-center justify-center text-4xl">{p.icon}</div>
                    <div className="mt-3 font-semibold text-ink dark:text-white">{p.name}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {p.district} · {p.availableStock} kg · In stock
                    </div>
                    <div className="mt-2 font-semibold text-brand-teal-700 dark:text-brand-teal-300">Rs. {p.pricePerKg}/kg</div>
                    <button className="mt-3 w-full h-10 rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 text-ink dark:text-white font-semibold text-sm hover:bg-white/90 dark:hover:bg-white/10 transition-all">
                      <span className="inline-flex items-center justify-center gap-2">
                        Express Interest <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
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


