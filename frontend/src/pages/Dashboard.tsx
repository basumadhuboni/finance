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
      <div className="flex gap-4">
        <input type="date" className="border px-2 py-1" value={range.from || ''} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <input type="date" className="border px-2 py-1" value={range.to || ''} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      </div>

      {isLoading ? (
        <div>Loading…</div>
      ) : isError ? (
        <div className="text-red-600">Failed to load summary.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-80 bg-white border rounded p-4">
            <h2 className="font-semibold mb-2">Expenses by Category</h2>
            {pieData.length === 0 ? (
              <div className="text-sm text-gray-600">No data in range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={120}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="h-80 bg-white border rounded p-4">
            <h2 className="font-semibold mb-2">Income vs Expense</h2>
            {typeData.length === 0 ? (
              <div className="text-sm text-gray-600">No data in range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={120}>
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="md:col-span-2 h-96 bg-white border rounded p-4">
            <h2 className="font-semibold mb-2">Amount by Category</h2>
            {barData.length === 0 ? (
              <div className="text-sm text-gray-600">No data in range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-30} textAnchor="end" interval={0} height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']
const TYPE_COLORS = ['#00C49F', '#FF8042']


