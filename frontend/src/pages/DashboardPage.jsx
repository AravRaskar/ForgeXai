import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { ArrowRight, FileCheck2, FileWarning, Files, UserCheck2 } from 'lucide-react'
import { getDashboardStats } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b']

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Unable to load dashboard. Is the backend running on port 8000?'))
  }, [])

  if (error) {
    return <EmptyState title="Dashboard unavailable" description={error} action={<Link className="btn-primary" to="/settings">Check setup</Link>} />
  }
  if (!stats) return <LoadingSpinner label="Loading dashboard metrics…" />

  const t = stats.totals
  const cards = [
    { label: 'Documents processed', value: t.processed, icon: Files, tone: 'bg-sky-100 text-navy-900' },
    { label: 'Classified successfully', value: t.classified, icon: FileCheck2, tone: 'bg-emerald-100 text-emerald-900' },
    { label: 'Suspicious indicators', value: t.suspicious, icon: FileWarning, tone: 'bg-red-100 text-red-900' },
    { label: 'Pending manual review', value: t.manual_review, icon: UserCheck2, tone: 'bg-amber-100 text-amber-900' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Operations dashboard</h1>
          <p className="text-sm text-slate-600">Live metrics from the analysis database</p>
        </div>
        <Link to="/upload" className="btn-primary">Upload document</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">{label}</p>
                <p className="mt-2 text-3xl font-bold text-navy-900">{value}</p>
              </div>
              <div className={`rounded-xl p-3 ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold text-navy-900">Category distribution</h2>
          {stats.category_distribution.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-500">No classified documents yet.</p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.category_distribution}>
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#16365c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-navy-900">Forgery analysis outcomes</h2>
          {stats.forgery_distribution.every((d) => d.count === 0) ? (
            <p className="mt-8 text-center text-sm text-slate-500">No forgery results yet.</p>
          ) : (
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.forgery_distribution} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80}>
                    {stats.forgery_distribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-navy-900">Recent uploads</h2>
          <Link to="/documents" className="text-sm font-medium text-navy-800 hover:underline">View all</Link>
        </div>
        {stats.recent_uploads.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No documents uploaded yet. Start with a sample scan or photo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Document ID</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Uploaded</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_uploads.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-mono text-xs">{row.id.slice(0, 8)}…</td>
                    <td className="px-5 py-3">{row.predicted_category || '—'}</td>
                    <td className="px-5 py-3">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge value={row.forgery_status || row.processing_status} />
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/results/${row.id}`} className="inline-flex items-center gap-1 text-navy-800 hover:underline">
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
