import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { api } from '../lib/api'

export default function Dashboard() {
  const [range, setRange] = useState<{ from?: string; to?: string }>({})
  const { data, isLoading, isError } = useQuery({
    queryKey: ['summary', range],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (range.from) params.set('from', range.from)
      if (range.to) params.set('to', range.to)
      const res = await api.get(`/api/transactions/summary?${params.toString()}`)
      return res.data as { byType: Array<{ type: string; _sum: { amount: string } }>; byCategory: Array<{ category: string; _sum: { amount: string } }> }
    },
  })

  const pieData = useMemo(() => {
    if (!data) return [] as Array<{ name: string; value: number }>
    return data.byCategory.map((c) => ({ name: c.category, value: Number(c._sum.amount) }))
  }, [data])

  const typeData = useMemo(() => {
    if (!data) return [] as Array<{ name: string; value: number }>
    return data.byType.map((t) => ({ name: t.type, value: Number(t._sum.amount) }))
  }, [data])

  const barData = useMemo(() => {
    if (!data) return [] as Array<{ category: string; amount: number }>
    return data.byCategory.map((c) => ({ category: c.category, amount: Number(c._sum.amount) }))
  }, [data])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Date Range Filter</h2>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">From</label>
            <input 
              type="date" 
              className="px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
              value={range.from || ''} 
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">To</label>
            <input 
              type="date" 
              className="px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
              value={range.to || ''} 
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} 
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="text-slate-600">Loading analytics...</div>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          Failed to load summary data. Please try again.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Expenses by Category</h2>
            {pieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500">No data available for selected range</div>
            ) : (
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110} label>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Income vs Expense</h2>
            {typeData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500">No data available for selected range</div>
            ) : (
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={110} label>
                      {typeData.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Amount by Category</h2>
            {barData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500">No data available for selected range</div>
            ) : (
              <div style={{ width: '100%', height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="category" angle={-30} textAnchor="end" interval={0} height={60} stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b']
const TYPE_COLORS = ['#10b981', '#ef4444']