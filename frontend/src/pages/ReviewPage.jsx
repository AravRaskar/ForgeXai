import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { documentFileUrl, getDocument, listDocuments, updateReview } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import StatusBadge from '../components/StatusBadge'

export default function ReviewPage() {
  const [queue, setQueue] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [doc, setDoc] = useState(null)
  const [comment, setComment] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    listDocuments({ page: 1, page_size: 50, pending_review: true }).then((res) => {
      const flagged = res.items.filter(
        (d) => d.forgery_status === 'suspicious' || d.forgery_status === 'manual_review' || d.review_status === 'manual_review',
      )
      setQueue(flagged.length ? flagged : res.items)
      if (flagged[0]) setSelectedId(flagged[0].id)
      else if (res.items[0]) setSelectedId(res.items[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    getDocument(selectedId, false).then(setDoc)
  }, [selectedId])

  async function act(action) {
    setMsg('')
    try {
      await updateReview(selectedId, action, comment || undefined)
      setMsg(`Saved: ${action}`)
      setComment('')
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Action failed')
    }
  }

  if (!queue.length && !doc) return <LoadingSpinner label="Loading review queue…" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Review dashboard</h1>
        <p className="text-sm text-slate-600">Manual verification for flagged or pending documents</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="card max-h-[32rem] overflow-y-auto p-3 lg:col-span-1">
          <p className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">Queue</p>
          {queue.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">No items in queue. Upload documents or mark for review.</p>
          ) : (
            queue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${selectedId === item.id ? 'bg-sky-100' : 'hover:bg-slate-50'}`}
              >
                <p className="font-medium truncate">{item.original_filename}</p>
                <StatusBadge value={item.forgery_status} />
              </button>
            ))
          )}
        </div>

        <div className="space-y-4 lg:col-span-3">
          {!doc ? (
            <p className="text-sm text-slate-500">Select a document from the queue.</p>
          ) : (
            <>
              <div className="card grid gap-4 p-5 md:grid-cols-2">
                <img src={documentFileUrl(doc.id)} alt="" className="max-h-72 rounded-lg border object-contain" />
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Category:</span> {doc.predicted_category}</p>
                  <p><span className="text-slate-500">Forgery:</span> <StatusBadge value={doc.forgery_status} /></p>
                  <p className="text-slate-700">{doc.forgery_details?.explanation}</p>
                  <Link to={`/results/${doc.id}`} className="text-navy-800 hover:underline">Open full analysis</Link>
                </div>
              </div>

              <div className="card p-5">
                <h2 className="font-semibold">Reviewer decision</h2>
                <textarea
                  className="input mt-3 min-h-[100px]"
                  placeholder="Comments (required for reject / escalate)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-primary" onClick={() => act('approve')}>Approve</button>
                  <button type="button" className="btn-secondary" onClick={() => act('reject')}>Reject</button>
                  <button type="button" className="btn-secondary" onClick={() => act('escalate')}>Escalate</button>
                </div>
                {msg ? <p className="mt-2 text-sm text-navy-800">{msg}</p> : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
