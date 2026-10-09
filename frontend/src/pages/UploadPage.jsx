import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, FileImage, Trash2, UploadCloud } from 'lucide-react'
import { analyzeDocument, uploadDocument } from '../services/api'

const CATEGORIES = [
  'Auto-detect',
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

const STEPS = ['Uploading', 'Preprocessing', 'Classification', 'OCR Extraction', 'Forgery Analysis', 'Results']

export default function UploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [category, setCategory] = useState('Auto-detect')
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [stepStates, setStepStates] = useState(STEPS.map((name) => ({ name, state: 'pending' })))

  const validateFile = (f) => {
    const okTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    const extOk = /\.(jpe?g|png|pdf)$/i.test(f.name)
    if (!extOk && !okTypes.includes(f.type)) {
      return 'Invalid file type. Use JPG, PNG, or PDF.'
    }
    if (f.size > 10 * 1024 * 1024) return 'File must be under 10 MB.'
    return null
  }

  const setSelectedFile = (f) => {
    const msg = validateFile(f)
    if (msg) {
      setError(msg)
      return
    }
    setError('')
    setFile(f)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) setSelectedFile(f)
  }, [])

  function advanceSteps(untilIndex) {
    setStepStates(
      STEPS.map((name, i) => ({
        name,
        state: i < untilIndex ? 'completed' : i === untilIndex ? 'in_progress' : 'pending',
      })),
    )
  }

  async function handleAnalyze() {
    if (!file) {
      setError('Select a document to upload.')
      return
    }
    if (!authorized) {
      setError('Confirm you are authorized to process this document.')
      return
    }
    setBusy(true)
    setError('')
    try {
      advanceSteps(0)
      const hint = category === 'Auto-detect' ? null : category
      const uploaded = await uploadDocument(file, hint, true)
      advanceSteps(2)
      await analyzeDocument(uploaded.id, true)
      setStepStates(STEPS.map((name) => ({ name, state: 'completed' })))
      navigate(`/results/${uploaded.id}`)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : err.message || 'Analysis failed.')
      setStepStates((prev) => prev.map((s) => (s.state === 'in_progress' ? { ...s, state: 'failed' } : s)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Upload document</h1>
        <p className="text-sm text-slate-600">Drag and drop or browse JPG, PNG, or PDF (first page for PDF).</p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="card flex flex-col items-center border-dashed border-2 border-sky-200 bg-sky-50/40 px-6 py-10 text-center"
      >
        <UploadCloud className="h-10 w-10 text-navy-800" />
        <p className="mt-3 font-medium text-navy-900">Drop file here</p>
        <p className="text-sm text-slate-600">or</p>
        <label className="btn-primary mt-3 cursor-pointer">
          Browse files
          <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])} />
        </label>
      </div>

      {file ? (
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium text-navy-900">{file.name}</p>
              <p className="text-sm text-slate-600">
                {(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown format'}
              </p>
            </div>
            <button type="button" className="btn-secondary !py-2" onClick={() => { setFile(null); setPreview(null) }}>
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
          {preview ? (
            <img src={preview} alt="Preview" className="mt-4 max-h-64 rounded-lg border object-contain" />
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <FileImage className="h-5 w-5" /> PDF selected — preview available after processing
            </div>
          )}
        </div>
      ) : null}

      <div className="card grid gap-4 p-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Document category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
          <input type="checkbox" className="mt-1" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
          I confirm I am authorized to process this customer document under bank policy.
        </label>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-navy-900">Processing pipeline</h2>
        <ol className="mt-4 space-y-2">
          {stepStates.map((s) => (
            <li key={s.name} className="flex items-center gap-3 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  s.state === 'completed' ? 'bg-emerald-500' : s.state === 'in_progress' ? 'bg-amber-400 animate-pulse' : s.state === 'failed' ? 'bg-red-500' : 'bg-slate-300'
                }`}
              />
              <span className="flex-1">{s.name}</span>
              {s.state === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
            </li>
          ))}
        </ol>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <button type="button" className="btn-primary w-full sm:w-auto" disabled={busy} onClick={handleAnalyze}>
        {busy ? 'Analyzing document…' : 'Analyze document'}
      </button>
    </div>
  )
}
