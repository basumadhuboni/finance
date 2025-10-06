import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts'
import { api } from '../lib/api'

export default function Dashboard() {
  const [range, setRange] = useState<{ from?: string; to?: string }>({})
  
  // Summary data query
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

  // Monthly trends query
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['trends', range],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (range.from) params.set('from', range.from)
      if (range.to) params.set('to', range.to)
      const res = await api.get(`/api/transactions/trends?${params.toString()}`)
      return res.data as { monthlyTrends: Array<{ month: string; income: number; expense: number }> }
    },
  })

  // Summary stats query
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', range],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (range.from) params.set('from', range.from)
      if (range.to) params.set('to', range.to)
      const res = await api.get(`/api/transactions/stats?${params.toString()}`)
      return res.data as {
        totalIncome: number
        totalExpense: number
        netSavings: number
        savingsRate: number
        biggestExpenseCategory: string
        averageDailySpending: number
      }
    },
  })

  const pieData = useMemo(() => {
    if (!data) return [] as Array<{ name: string; value: number }>
    // Now byCategory only contains expense categories from the backend
    return data.byCategory.map((category) => ({ name: category.category, value: Number(category._sum.amount) }))
  }, [data])

  const typeData = useMemo(() => {
    if (!data) return [] as Array<{ name: string; value: number }>
    return data.byType.map((t) => ({ name: t.type, value: Number(t._sum.amount) }))
  }, [data])

  const barData = useMemo(() => {
    if (!data) return [] as Array<{ category: string; amount: number }>
    return data.byCategory.map((c) => ({ category: c.category, amount: Number(c._sum.amount) }))
  }, [data])

  // Format monthly trends data for line chart
  const lineData = useMemo(() => {
    if (!trendsData?.monthlyTrends) return []
    return trendsData.monthlyTrends.map(trend => ({
      month: new Date(trend.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      income: trend.income,
      expense: trend.expense,
      net: trend.income - trend.expense
    }))
  }, [trendsData])

  const isLoadingAny = isLoading || trendsLoading || statsLoading

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

      {/* Summary Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SummaryCard
            title="Total Income"
            value={`$${statsData.totalIncome.toLocaleString()}`}
            icon="💰"
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <SummaryCard
            title="Total Expenses"
            value={`$${statsData.totalExpense.toLocaleString()}`}
            icon="💸"
            color="text-red-600"
            bgColor="bg-red-50"
          />
          <SummaryCard
            title="Net Savings"
            value={`$${statsData.netSavings.toLocaleString()}`}
            icon="💎"
            color={statsData.netSavings >= 0 ? "text-green-600" : "text-red-600"}
            bgColor={statsData.netSavings >= 0 ? "bg-green-50" : "bg-red-50"}
          />
          <SummaryCard
            title="Savings Rate"
            value={`${statsData.savingsRate}%`}
            icon="📊"
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <SummaryCard
            title="Biggest Expense"
            value={statsData.biggestExpenseCategory}
            icon="🏆"
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
          <SummaryCard
            title="Avg Daily Spending"
            value={`$${statsData.averageDailySpending.toFixed(2)}`}
            icon="📅"
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
        </div>
      )}

      {isLoadingAny ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="text-slate-600">Loading analytics...</div>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          Failed to load summary data. Please try again.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Income vs Expense Pie Chart */}
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

            {/* Spending by Category Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Spending by Category</h2>
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
          </div>

          {/* Monthly Spending Trend Line Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Monthly Spending Trend</h2>
            {lineData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500">No data available for selected range</div>
            ) : (
              <div style={{ width: '100%', height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} name="Income" />
                    <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} name="Expense" />
                    <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={3} name="Net" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category Comparison Bar Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Category Comparison</h2>
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

// Summary Card Component
function SummaryCard({ title, value, icon, color, bgColor }: {
  title: string
  value: string
  icon: string
  color: string
  bgColor: string
}) {
  return (
    <div className={`${bgColor} rounded-xl border border-slate-200 p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}