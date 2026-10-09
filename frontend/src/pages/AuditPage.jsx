import { useEffect, useState } from 'react'
import { getAuditLogs } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AuditPage() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    getAuditLogs(page).then(setData)
  }, [page])

  if (!data) return <LoadingSpinner />

  const totalPages = Math.max(1, Math.ceil(data.total / data.page_size))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Audit logs</h1>
        <p className="text-sm text-slate-600">Read-only trail of uploads, analysis, and review actions</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Actor</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 font-medium">{row.action}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.document_id ? `${row.document_id.slice(0, 8)}…` : '—'}</td>
                <td className="px-4 py-3">{row.actor_email || 'system'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between text-sm">
        <span>Page {page} / {totalPages}</span>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary !py-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <button type="button" className="btn-secondary !py-1" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
