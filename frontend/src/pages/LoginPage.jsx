import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('staff@bankdemo.local')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.includes('@') || password.length < 4) {
      setError('Enter a valid email and password (min 4 characters).')
      return
    }
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check credentials and backend status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-navy-950 p-10 text-white md:flex">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <ShieldCheck className="h-10 w-10 text-sky-200" />
              <div>
                <h1 className="text-xl font-bold">SecureDoc Verify</h1>
                <p className="text-sm text-sky-200/80">AI Document Intelligence</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-sky-100/90">
              Prototype dashboard for classifying banking documents, extracting OCR fields, and running forgery heuristics
              (ELA, metadata, OpenCV). Production deployments require hardened authentication, RBAC, and compliance controls.
            </p>
          </div>
          <p className="text-xs text-sky-200/60">BE Computer Engineering — Demonstration Build</p>
        </div>

        <div className="p-8 md:p-10">
          <h2 className="text-2xl font-bold text-navy-900">Staff sign in</h2>
          <p className="mt-1 text-sm text-slate-600">Authorized bank personnel only</p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-900">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input className="input pl-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-900">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  className="input pl-9 pr-10"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-slate-100"
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in securely'}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-sky-200 bg-sky-100/60 p-4 text-sm text-navy-900">
            <p className="font-semibold">Demo credentials (local)</p>
            <p className="mt-1">Email: <code>staff@bankdemo.local</code></p>
            <p>Password: <code>demo1234</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}
