import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'

export default function Upload() {
  const [tab, setTab] = useState<'receipt' | 'statement'>('receipt')
  const [errorMessage, setErrorMessage] = useState<string>('')
  
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
        </div>

        {tab === 'receipt' ? (
          <FileBox 
            onFile={(f) => receipt.mutate(f)} 
            label="Upload Receipt Image or PDF" 
            description="Supports JPG, PNG, and PDF formats"
          />
        ) : (
          <FileBox 
            onFile={(f) => statement.mutate(f)} 
            label="Upload Bank Statement PDF" 
            description="PDF format from your bank"
          />
        )}
      </div>

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