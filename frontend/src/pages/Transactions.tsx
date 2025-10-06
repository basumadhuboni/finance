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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Filter Transactions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
            <input 
              type="date" 
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
              value={filters.from} 
              onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
            <input 
              type="date" 
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
              value={filters.to} 
              onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
            <select 
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white" 
              value={filters.type} 
              onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
            >
              <option value="">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <input 
              placeholder="Filter by category" 
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
              value={filters.category} 
              onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })} 
            />
          </div>
          <div className="flex items-end">
            <button 
              className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-sm hover:shadow-md" 
              onClick={() => qc.invalidateQueries({ queryKey: ['transactions'] })}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <AddForm onAdd={(payload) => create.mutate(payload as any)} />

      {create.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to add transaction. Please check your inputs and try again.
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="text-slate-600">Loading transactions...</div>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          Failed to load transactions. Please try again.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {data && data.items.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No transactions found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Category</th>
                    <th className="text-right p-4 text-sm font-semibold text-slate-700">Amount</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm text-slate-700">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          tx.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-700">{tx.category}</td>
                      <td className="p-4 text-right text-sm font-semibold text-slate-900">
                        ${(tx as any).amount?.toFixed ? (tx as any).amount.toFixed(2) : Number((tx as any).amount).toFixed(2)}
                      </td>
                      <td className="p-4 text-sm text-slate-600">{tx.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              Page {data?.page} of {data ? Math.ceil(data.total / data.pageSize) : 1} · Total: {data?.total || 0} transactions
            </div>
            <div className="flex gap-2">
              <button 
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium" 
                disabled={(data?.page ?? 1) <= 1} 
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                Previous
              </button>
              <button 
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium" 
                disabled={data ? data.page >= Math.ceil(data.total / data.pageSize) : true} 
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                Next
              </button>
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Add New Transaction</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
          <input 
            type="date" 
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
            value={form.date as any} 
            onChange={(e) => setForm({ ...form, date: e.target.value as any })} 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
          <select 
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white" 
            value={form.type} 
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
          >
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
          <input 
            placeholder="e.g., Food" 
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
            value={form.category} 
            onChange={(e) => setForm({ ...form, category: e.target.value })} 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
          <input 
            placeholder="0.00" 
            type="number" 
            step="0.01" 
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
            value={form.amount as any} 
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
          <input 
            placeholder="Optional" 
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
            value={form.description || ''} 
            onChange={(e) => setForm({ ...form, description: e.target.value })} 
          />
        </div>
        <div className="flex items-end">
          <button 
            className="w-full px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-all shadow-sm hover:shadow-md" 
            onClick={() => onAdd({ ...form, date: new Date(form.date as any).toISOString() })}
          >
            Add Transaction
          </button>
        </div>
      </div>
    </div>
  )
}