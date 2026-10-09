import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDocuments } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import StatusBadge from '../components/StatusBadge'

const CATEGORIES = [
  '',
  'Aadhaar Card',
  'PAN Card',
  'Cheque',
  'Bank Statement',
  'Passport',
  'Driving Licence',
  'Voter ID',
  'Salary Slip',
  'Loan Application',
  'Other / Unknown',
]

export default function DocumentsPage() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [suspiciousOnly, setSuspiciousOnly] = useState(false)
  const [pendingReview, setPendingReview] = useState(false)

  useEffect(() => {
    listDocuments({
      page,
      page_size: 10,
      search: search || undefined,
      category: category || undefined,
      suspicious_only: suspiciousOnly || undefined,
      pending_review: pendingReview || undefined,
    }).then(setData)
  }, [page, search, category, suspiciousOnly, pendingReview])

  if (!data) return <LoadingSpinner />

  const totalPages = Math.max(1, Math.ceil(data.total / data.page_size))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Document management</h1>
        <p className="text-sm text-slate-600">Search, filter, and open prior analyses</p>
      </div>

      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <input className="input md:col-span-2" placeholder="Search filename…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} />
        <select className="input" value={category} onChange={(e) => { setPage(1); setCategory(e.target.value) }}>
          {CATEGORIES.map((c) => (
            <option key={c || 'all'} value={c}>{c || 'All categories'}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={suspiciousOnly} onChange={(e) => { setPage(1); setSuspiciousOnly(e.target.checked) }} /> Suspicious
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={pendingReview} onChange={(e) => { setPage(1); setPendingReview(e.target.checked) }} /> Pending review
          </label>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3">Forgery</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs">{row.id.slice(0, 8)}…</td>
                <td className="px-4 py-3">{row.original_filename}</td>
                <td className="px-4 py-3">{row.predicted_category || row.category_hint || '—'}</td>
                <td className="px-4 py-3">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge value={row.forgery_status} /></td>
                <td className="px-4 py-3"><StatusBadge value={row.review_status} /></td>
                <td className="px-4 py-3">
                  <Link className="text-navy-800 hover:underline" to={`/results/${row.id}`}>Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No documents match your filters.</p> : null}
      </div>

      <div className="flex items-center justify-between text-sm">
        <p>Page {page} of {totalPages} ({data.total} total)</p>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary !py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <button type="button" className="btn-secondary !py-1.5" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
