import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Copy, Download, Eye, EyeOff } from 'lucide-react'
import api, { documentFileUrl, documentElaUrl, documentReportUrl, getDocument, updateReview } from '../services/api'
import AuthenticatedImage from '../components/AuthenticatedImage'
import LoadingSpinner from '../components/LoadingSpinner'
import StatusBadge from '../components/StatusBadge'

export default function ResultsPage() {
  const { id } = useParams()
  const [doc, setDoc] = useState(null)
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  async function load(rev = reveal) {
    try {
      const data = await getDocument(id, rev)
      setDoc(data)
    } catch {
      setError('Document not found or access denied.')
    }
  }

  useEffect(() => {
    load(false)
  }, [id])

  async function toggleReveal() {
    const next = !reveal
    setReveal(next)
    await load(next)
  }

  async function review(action) {
    setActionMsg('')
    let c = action === 'approve' ? 'Approved via results page' : undefined
    if (action === 'reject') {
      c = window.prompt('Rejection comment (required):')
      if (!c?.trim()) {
        setActionMsg('Rejection requires a comment.')
        return
      }
    }
    try {
      await updateReview(id, action, c)
      setActionMsg(`Document ${action.replace('_', ' ')} updated.`)
      await load(reveal)
    } catch (err) {
      setActionMsg(err.response?.data?.detail || 'Review action failed.')
    }
  }

  async function downloadReport() {
    const res = await api.get(documentReportUrl(id), { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis-${id.slice(0, 8)}.pdf`
    a.click()
  }

  const fields = reveal ? doc?.ocr_fields : doc?.ocr_fields_masked

  if (error) return <p className="text-red-600">{error}</p>
  if (!doc) return <LoadingSpinner label="Loading analysis results…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Document ID</p>
          <h1 className="font-mono text-lg font-bold text-navy-900">{doc.id}</h1>
          <p className="mt-1 text-sm text-slate-600">{doc.original_filename}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => review('approve')}>Approve</button>
          <button type="button" className="btn-secondary" onClick={() => review('manual_review')}>Manual review</button>
          <button type="button" className="btn-secondary" onClick={() => review('reject')}>Reject</button>
          <button type="button" className="btn-primary" onClick={downloadReport}>
            <Download className="h-4 w-4" /> Report
          </button>
        </div>
      </div>

      {actionMsg ? <p className="rounded-lg bg-sky-100 px-3 py-2 text-sm text-navy-900">{actionMsg}</p> : null}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Automated “no suspicious indicators” is not proof of authenticity. Use institutional verification for final decisions.
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <h2 className="font-semibold">Document preview</h2>
          <AuthenticatedImage url={documentFileUrl(id)} alt="Document" className="mt-3 max-h-80 w-full rounded-lg border object-contain" />
        </div>
        <div className="card space-y-4 p-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-500">Predicted category</p>
              <p className="font-semibold">{doc.predicted_category || '—'}</p>
              <p className="text-xs text-slate-500">Source: {doc.classification_source || 'n/a'}</p>
              {doc.classification_confidence != null ? (
                <p className="text-xs text-slate-500">Confidence (heuristic/demo): {(doc.classification_confidence * 100).toFixed(0)}%</p>
              ) : (
                <p className="text-xs text-slate-500">Confidence not reported (no trained model)</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Review status</p>
              <StatusBadge value={doc.review_status} />
              <p className="mt-2 text-xs text-slate-500">Processing: {doc.processing_time_ms ?? '—'} ms</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Forgery summary</p>
            <StatusBadge value={doc.forgery_status} />
            <p className="mt-2 text-sm text-slate-700">{doc.forgery_details?.recommendation}</p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">OCR extracted fields</h2>
          <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={toggleReveal}>
            {reveal ? <><EyeOff className="h-3 w-3" /> Mask</> : <><Eye className="h-3 w-3" /> Reveal (authorized)</>}
          </button>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {fields &&
            Object.entries(fields)
              .filter(([k]) => !k.startsWith('_'))
              .map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-xs uppercase text-slate-500">{k.replace(/_/g, ' ')}</dt>
                  <dd className="text-sm font-medium">{v}</dd>
                </div>
              ))}
        </dl>
        {reveal && doc.ocr_raw_text ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Raw OCR text</p>
              <button
                type="button"
                className="btn-secondary !py-1 text-xs"
                onClick={() => navigator.clipboard.writeText(doc.ocr_raw_text)}
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-navy-950 p-3 text-xs text-sky-100">{doc.ocr_raw_text}</pre>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">ELA visualization</h2>
          {doc.ela_url ? (
            <>
              <img src={documentElaUrl(id)} alt="ELA" className="mt-3 rounded-lg border" />
              <p className="mt-2 text-xs text-slate-600">{doc.forgery_details?.ela?.interpretation}</p>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-600">{doc.forgery_details?.ela?.reason || 'Not available for this file type.'}</p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Metadata & anomalies</h2>
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
            {JSON.stringify(doc.forgery_details?.metadata, null, 2)}
          </pre>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
            {(doc.forgery_details?.anomalies || []).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">{doc.forgery_details?.cnn?.message}</p>
        </div>
      </div>

      <Link to="/documents" className="text-sm font-medium text-navy-800 hover:underline">← Back to document management</Link>
    </div>
  )
}
