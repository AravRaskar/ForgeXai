import { useEffect, useState } from 'react'
import { getHealth } from '../services/api'

export default function SettingsPage() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setError('Backend unreachable at /api/health'))
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Settings & help</h1>
        <p className="text-sm text-slate-600">System status and local run instructions (Windows)</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">Application</h2>
        <p className="mt-2 text-sm text-slate-700">SecureDoc Verify — academic prototype for BE Computer Engineering.</p>
        <p className="mt-2 text-sm text-amber-800">Not production-ready for real banking or customer PII in unsecured environments.</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">Supported inputs</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
          <li>Document types: Aadhaar, PAN, Cheque, Bank Statement, Passport, DL, Voter ID, Salary Slip, Loan Application, Other</li>
          <li>Formats: JPG, JPEG, PNG, PDF (first page rasterized)</li>
          <li>Max upload: 10 MB</li>
        </ul>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">Service status</h2>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {health ? (
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt>API</dt><dd>{health.status}</dd></div>
            <div className="flex justify-between"><dt>Database</dt><dd>{health.database}</dd></div>
            <div className="flex justify-between"><dt>OCR</dt><dd>{health.ocr.available ? 'Available' : 'Unavailable'} — {health.ocr.message}</dd></div>
            <div className="flex justify-between"><dt>Classification CNN weights</dt><dd>{health.models.classification_cnn ? 'File present' : 'Not loaded (demo heuristics)'}</dd></div>
            <div className="flex justify-between"><dt>Forgery CNN weights</dt><dd>{health.models.forgery_cnn ? 'File present' : 'Not loaded (ELA/heuristics)'}</dd></div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Checking…</p>
        )}
      </div>

      <div className="card space-y-3 p-5 text-sm text-slate-700">
        <h2 className="font-semibold text-navy-900">Run locally (Windows)</h2>
        <pre className="overflow-x-auto rounded-lg bg-navy-950 p-4 text-xs text-sky-100">{`cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy ..\\.env.example .env
uvicorn app.main:app --reload --port 8000

cd ..\\frontend
npm install
npm run dev`}
        </pre>
        <p>Install <strong>Tesseract OCR</strong> for text extraction and add <code>TESSERACT_CMD</code> to <code>.env</code> if not on PATH.</p>
        <p>Place trained weights at <code>backend/models/weights/classifier.pt</code> and <code>forgery_cnn.pt</code> when available.</p>
      </div>
    </div>
  )
}
