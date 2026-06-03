import React from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { sellerDummy } from '../../data/sellerDummy'

export function MonthlyEarningsChart() {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sellerDummy.earnings.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)' }}
            formatter={(value: unknown) => [`Rs. ${Number(value).toLocaleString()}`, 'Income']}
          />
          <Bar dataKey="income" radius={[12, 12, 0, 0]} fill="#1FAE67" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

