import { FileSearch } from 'lucide-react'

export default function EmptyState({ title, description, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 rounded-full bg-sky-100 p-4 text-navy-900">
        <FileSearch className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
