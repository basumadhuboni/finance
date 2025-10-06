import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'

type Tx = {
  id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  category: string
  description?: string
  date: string
}

export default function Transactions() {
  const [filters, setFilters] = useState({ from: '', to: '', type: '', category: '', page: 1, pageSize: 10 })
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.type) params.set('type', filters.type)
      if (filters.category) params.set('category', filters.category)
      params.set('page', String(filters.page))
      params.set('pageSize', String(filters.pageSize))
      const res = await api.get(`/api/transactions?${params.toString()}`)
      return res.data as { items: Tx[]; total: number; page: number; pageSize: number }
    },
  })

  const create = useMutation({
    mutationFn: async (payload: Omit<Tx, 'id'>) => {
      const res = await api.post('/api/transactions', payload)
      return res.data as Tx
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-end">
        <input type="date" className="border px-2 py-1" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })} />
        <input type="date" className="border px-2 py-1" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })} />
        <select className="border px-2 py-1" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}>
          <option value="">All</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>
        <input placeholder="Category" className="border px-2 py-1" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })} />
        <button className="border px-3 py-1" onClick={() => qc.invalidateQueries({ queryKey: ['transactions'] })}>Apply</button>
      </div>

      <AddForm onAdd={(payload) => create.mutate(payload as any)} />

      {create.isError && <div className="text-red-600 text-sm">Failed to add. Please check inputs.</div>}

      {isLoading ? (
        <div>Loading…</div>
      ) : isError ? (
        <div className="text-red-600">Failed to load transactions.</div>
      ) : (
        <div className="bg-white border rounded">
          {data && data.items.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">No transactions found for the selected filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((tx) => (
                  <tr key={tx.id} className="border-t">
                    <td className="p-2">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="p-2">{tx.type}</td>
                    <td className="p-2">{tx.category}</td>
                    <td className="p-2 text-right">{(tx as any).amount?.toFixed ? (tx as any).amount.toFixed(2) : Number((tx as any).amount).toFixed(2)}</td>
                    <td className="p-2">{tx.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between p-2">
            <div>
              Page {data?.page} of {data ? Math.ceil(data.total / data.pageSize) : 1}
            </div>
            <div className="flex gap-2">
              <button className="border px-2 py-1" disabled={(data?.page ?? 1) <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Prev</button>
              <button className="border px-2 py-1" disabled={data ? data.page >= Math.ceil(data.total / data.pageSize) : true} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddForm({ onAdd }: { onAdd: (tx: Omit<Tx, 'id'>) => void }) {
  const [form, setForm] = useState<Omit<Tx, 'id'>>({ type: 'EXPENSE', amount: 0, category: '', description: '', date: new Date().toISOString().slice(0, 10) } as any)
  return (
    <div className="bg-white border rounded p-3 flex flex-wrap gap-2 items-end">
      <input type="date" className="border px-2 py-1" value={form.date as any} onChange={(e) => setForm({ ...form, date: e.target.value as any })} />
      <select className="border px-2 py-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
        <option value="INCOME">Income</option>
        <option value="EXPENSE">Expense</option>
      </select>
      <input placeholder="Category" className="border px-2 py-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
      <input placeholder="Amount" type="number" step="0.01" className="border px-2 py-1" value={form.amount as any} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
      <input placeholder="Description" className="border px-2 py-1" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <button className="border px-3 py-1" onClick={() => onAdd({ ...form, date: new Date(form.date as any).toISOString() })}>Add</button>
    </div>
  )
}


