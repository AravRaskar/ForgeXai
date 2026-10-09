import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: FileUp, label: 'Upload Document' },
  { to: '/documents', icon: ClipboardList, label: 'Document Management' },
  { to: '/review', icon: ShieldCheck, label: 'Review Dashboard' },
  { to: '/audit', icon: ScrollText, label: 'Audit Logs' },
  { to: '/settings', icon: Settings, label: 'Settings & Help' },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-full bg-[#f4f7fb]">
      <div className="flex min-h-full">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-navy-900/10 bg-navy-950 text-white transition md:static md:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
            <ShieldCheck className="h-7 w-7 text-sky-200" />
            <div>
              <p className="text-sm font-semibold leading-tight">SecureDoc Verify</p>
              <p className="text-[11px] text-sky-200/80">Banking Document Intelligence</p>
            </div>
            <button type="button" className="ml-auto md:hidden" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-1 p-3">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive ? 'bg-white/15 text-white' : 'text-sky-100/90 hover:bg-white/10'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="absolute bottom-0 w-full border-t border-white/10 p-4 text-xs text-sky-200/70">
            Academic prototype — not for production banking.
          </div>
        </aside>

        <div className="flex min-h-full flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-lg p-2 hover:bg-slate-100 md:hidden" onClick={() => setOpen(true)}>
                <Menu className="h-5 w-5 text-navy-900" />
              </button>
              <div>
                <p className="text-sm font-medium text-slate-500">Authorized staff portal</p>
                <p className="text-base font-semibold text-navy-900">Document Classification & Forgery Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-navy-900">{user?.full_name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <button type="button" className="btn-secondary !py-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
