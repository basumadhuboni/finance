import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'

type AITransaction = {
  date: string
  description: string
  category: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
}

export default function Upload() {
  const [tab, setTab] = useState<'receipt' | 'statement' | 'ai'>('receipt')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [aiTransactions, setAiTransactions] = useState<AITransaction[]>([])
  const [showAiReview, setShowAiReview] = useState(false)
  
  const receipt = useMutation({
    mutationFn: async (file: File) => {
      setErrorMessage('')
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/api/uploads/receipt', form)
      return res.data as { imported: number }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.message || 'Unknown error'
      setErrorMessage(`Receipt upload failed: ${msg}`)
      console.error('Receipt upload error:', error)
    }
  })
  const statement = useMutation({
    mutationFn: async (file: File) => {
      setErrorMessage('')
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/api/uploads/statement', form)
      return res.data as { imported: number }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.message || 'Unknown error'
      setErrorMessage(`Statement upload failed: ${msg}`)
      console.error('Statement upload error:', error)
    }
  })

  const aiReceipt = useMutation({
    mutationFn: async (file: File) => {
      setErrorMessage('')
      setShowAiReview(false)
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/api/uploads/ai-receipt', form)
      return res.data as { extractedText: string; transactions: AITransaction[] }
    },
    onSuccess: (data) => {
      setAiTransactions(data.transactions)
      setShowAiReview(true)
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.message || 'Unknown error'
      setErrorMessage(`AI receipt analysis failed: ${msg}`)
      console.error('AI receipt error:', error)
    }
  })

  const confirmAi = useMutation({
    mutationFn: async (transactions: AITransaction[]) => {
      const res = await api.post('/api/uploads/ai-receipt/confirm', { transactions })
      return res.data as { imported: number }
    },
    onSuccess: () => {
      setShowAiReview(false)
      setAiTransactions([])
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.message || 'Unknown error'
      setErrorMessage(`Failed to save transactions: ${msg}`)
      console.error('Confirm error:', error)
    }
  })

  const handleUpdateTransaction = (index: number, field: keyof AITransaction, value: string | number) => {
    const updated = [...aiTransactions]
    updated[index] = { ...updated[index], [field]: value }
    setAiTransactions(updated)
  }

  const handleDeleteTransaction = (index: number) => {
    setAiTransactions(aiTransactions.filter((_, i) => i !== index))
  }

  const handleConfirm = () => {
    confirmAi.mutate(aiTransactions)
  }

  const handleCancel = () => {
    setShowAiReview(false)
    setAiTransactions([])
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Import Transactions</h1>
        <p className="text-slate-600 mb-6">Upload receipts or bank statements to automatically import your transactions</p>
        
        <div className="flex gap-2 mb-6">
          <button 
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              tab === 'receipt' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            onClick={() => setTab('receipt')}
          >
            📸 Receipt OCR
          </button>
          <button 
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              tab === 'statement' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            onClick={() => setTab('statement')}
          >
            📄 Statement PDF
          </button>
          <button 
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              tab === 'ai' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            onClick={() => setTab('ai')}
          >
            🤖 AI Analyzer
          </button>
        </div>

        {tab === 'receipt' ? (
          <FileBox 
            onFile={(f) => receipt.mutate(f)} 
            label="Upload Receipt Image or PDF" 
            description="Supports JPG, PNG, and PDF formats"
          />
        ) : tab === 'statement' ? (
          <FileBox 
            onFile={(f) => statement.mutate(f)} 
            label="Upload Bank Statement PDF" 
            description="PDF format from your bank"
          />
        ) : (
          <FileBox 
            onFile={(f) => aiReceipt.mutate(f)} 
            label="Upload Receipt for AI Analysis" 
            description="AI will extract and categorize transactions"
          />
        )}
      </div>

      {/* AI Review Modal */}
      {showAiReview && aiTransactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Review Extracted Transactions</h2>
          <p className="text-slate-600 mb-4">Please review and edit the transactions before adding them</p>
          
          <div className="space-y-4 mb-6">
            {aiTransactions.map((transaction, index) => (
              <div key={index} className="border border-slate-300 rounded-lg p-4 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={transaction.date}
                      onChange={(e) => handleUpdateTransaction(index, 'date', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select 
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={transaction.type}
                      onChange={(e) => handleUpdateTransaction(index, 'type', e.target.value)}
                    >
                      <option value="EXPENSE">Expense</option>
                      <option value="INCOME">Income</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={transaction.category}
                      onChange={(e) => handleUpdateTransaction(index, 'category', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={transaction.amount}
                      onChange={(e) => handleUpdateTransaction(index, 'amount', parseFloat(e.target.value))}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={transaction.description}
                      onChange={(e) => handleUpdateTransaction(index, 'description', e.target.value)}
                    />
                  </div>
                </div>
                
                <button 
                  className="mt-3 px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-all text-sm font-medium"
                  onClick={() => handleDeleteTransaction(index)}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex gap-3">
            <button 
              className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
              onClick={handleConfirm}
              disabled={confirmAi.isPending}
            >
              {confirmAi.isPending ? '⏳ Saving...' : `✅ Add ${aiTransactions.length} Transaction${aiTransactions.length !== 1 ? 's' : ''}`}
            </button>
            <button 
              className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-all font-medium"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            ❌ {errorMessage}
            <div className="text-sm mt-2 text-red-600">Check the browser console for more details.</div>
          </div>
        )}
        
        {receipt.isPending && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
            ⏳ Processing receipt... This may take a moment.
          </div>
        )}
        {receipt.data && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            ✅ Successfully imported {receipt.data.imported} transaction{receipt.data.imported !== 1 ? 's' : ''} from receipt
          </div>
        )}
        
        {statement.isPending && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
            ⏳ Processing statement... This may take a moment.
          </div>
        )}
        {statement.data && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            ✅ Successfully imported {statement.data.imported} transaction{statement.data.imported !== 1 ? 's' : ''} from statement
          </div>
        )}
        
        {aiReceipt.isPending && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
            🤖 Analyzing receipt with AI... This may take a moment.
          </div>
        )}
        
        {confirmAi.data && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            ✅ Successfully added {confirmAi.data.imported} transaction{confirmAi.data.imported !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function FileBox({ onFile, label, description }: { onFile: (f: File) => void; label: string; description: string }) {
  const [isDragging, setIsDragging] = useState(false)
  
  return (
    <label 
      className={`border-2 border-dashed rounded-xl px-8 py-16 block text-center cursor-pointer transition-all ${
        isDragging 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files?.[0]) {
          onFile(e.dataTransfer.files[0])
        }
      }}
    >
      <div className="text-5xl mb-4">📁</div>
      <div className="text-lg font-semibold text-slate-800 mb-2">{label}</div>
      <div className="text-sm text-slate-600 mb-4">{description}</div>
      <div className="text-sm text-slate-500">Click to browse or drag and drop</div>
      <input 
        type="file" 
        className="hidden" 
        onChange={(e) => e.target.files && onFile(e.target.files[0])} 
      />
    </label>
  )
}