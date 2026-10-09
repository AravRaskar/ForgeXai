import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-navy-800">
      <Loader2 className="h-8 w-8 animate-spin text-navy-900" />
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  )
}
