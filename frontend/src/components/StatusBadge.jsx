const styles = {
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-900',
  manual_review: 'bg-amber-100 text-amber-900',
  no_suspicious: 'bg-emerald-100 text-emerald-800',
  suspicious: 'bg-red-100 text-red-800',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  processing: 'bg-sky-100 text-sky-900',
}

const labels = {
  no_suspicious: 'No suspicious indicators',
  suspicious: 'Suspicious indicators',
  manual_review: 'Manual review',
  approve: 'Approved',
}

export default function StatusBadge({ value }) {
  const key = (value || 'pending').toLowerCase().replace(/\s+/g, '_')
  const cls = styles[key] || 'bg-slate-100 text-slate-700'
  const label = labels[key] || value || 'Unknown'
  return <span className={`badge ${cls}`}>{label}</span>
}
