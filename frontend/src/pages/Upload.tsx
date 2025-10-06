import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'

export default function Upload() {
  const [tab, setTab] = useState<'receipt' | 'statement'>('receipt')
  const receipt = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/api/uploads/receipt', form)
      return res.data as { imported: number }
    },
  })
  const statement = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/api/uploads/statement', form)
      return res.data as { imported: number }
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={`border px-3 py-1 ${tab === 'receipt' ? 'bg-gray-200' : ''}`} onClick={() => setTab('receipt')}>Receipt OCR</button>
        <button className={`border px-3 py-1 ${tab === 'statement' ? 'bg-gray-200' : ''}`} onClick={() => setTab('statement')}>Statement PDF</button>
      </div>
      {tab === 'receipt' ? (
        <FileBox onFile={(f) => receipt.mutate(f)} label="Upload image or PDF" />
      ) : (
        <FileBox onFile={(f) => statement.mutate(f)} label="Upload statement PDF" />
      )}
      <div>
        {receipt.isPending && <div>Uploading…</div>}
        {receipt.isError && <div className="text-red-600">Receipt import failed.</div>}
        {receipt.data && <div>Receipt imported: {receipt.data.imported}</div>}
        {statement.isPending && <div>Uploading…</div>}
        {statement.isError && <div className="text-red-600">Statement import failed.</div>}
        {statement.data && <div>Statement imported: {statement.data.imported}</div>}
      </div>
    </div>
  )
}

function FileBox({ onFile, label }: { onFile: (f: File) => void; label: string }) {
  return (
    <label className="border rounded px-4 py-12 block text-center bg-white">
      <div className="mb-2">{label}</div>
      <input type="file" className="hidden" onChange={(e) => e.target.files && onFile(e.target.files[0])} />
    </label>
  )
}


