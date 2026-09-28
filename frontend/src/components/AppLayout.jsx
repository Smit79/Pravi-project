import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Boxes, Map, Wrench, LogOut, Menu, X, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../context/ThemeContext'
import NotificationBell, { useNotifications } from './Notifications'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/assets', label: 'Assets', icon: Boxes },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/work-orders', label: 'Work orders', icon: Wrench },
]

const PAGE_TITLES = [[/^\/$/, 'Dashboard'], [/^\/assets\/new/, 'New asset'], [/^\/assets\/[^/]+\/edit/, 'Edit asset'], [/^\/assets\/./, 'Asset'], [/^\/assets/, 'Assets'], [/^\/map/, 'Map'], [/^\/work-orders/, 'Work orders']]

// Browser tab: "(3) Map · Pravi" — page name plus unread notification count
function useTabTitle() {
  const { pathname } = useLocation()
  const { data } = useNotifications()
  const page = PAGE_TITLES.find(([re]) => re.test(pathname))?.[1]
  const unread = data?.unread ?? 0
  useEffect(() => {
    document.title = `${unread ? `(${unread}) ` : ''}${page ? `${page} · ` : ''}Pravi`
  }, [page, unread])
}

const ROLE_LABEL = { ADMIN: 'Admin', ENGINEER: 'Engineer', VIEWER: 'Viewer' }

export function Logo({ className = '' }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <img src="/favicon.svg" alt="" className="size-7" />
      <span className="text-[19px] font-semibold tracking-[-0.03em] text-ink">Pravi</span>
    </span>
  )
}

function ReportCard() {
  const url = `${window.location.origin}/report`
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success('Report link copied') } catch { toast.error('Could not copy link') }
  }
  return (
    <div className="rounded-2xl border border-line/60 bg-surface p-4 text-center">
      <p className="text-[15px] font-semibold text-ink">Citizen reporting</p>
      <p className="mt-1.5 text-xs leading-[18px] text-ink-3">Residents can flag damaged lights, roads and pumps from a public page or an asset’s QR tag.</p>
      <div className="mt-4 flex gap-2">
        <button onClick={copy} className="h-8 flex-1 rounded-full border border-line-strong text-xs font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink">Copy link</button>
        <a href="/report" target="_blank" rel="noreferrer" className="flex h-8 flex-1 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-on-brand transition-colors hover:bg-brand-500">Open page</a>
      </div>
    </div>
  )
}

function Sidebar({ onNavigate }) {
  return (
    <nav className="flex h-full flex-col" aria-label="Main">
      <div className="flex h-[72px] items-center px-6"><Logo /></div>
      <div className="flex-1 space-y-1 px-3 pt-4">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) =>
              `flex h-10 items-center gap-3 rounded-full px-4 text-sm transition-colors ${
                isActive ? 'bg-surface font-medium text-ink' : 'text-ink-3 hover:bg-surface/60 hover:text-ink'}`}
          >
            <Icon className="size-[18px]" strokeWidth={1.6} />
            {label}
          </NavLink>
        ))}
      </div>
      <div className="p-4">
        <ReportCard />
        <p className="mt-3 text-center text-[11px] leading-4 text-ink-4">Navpur Municipal Corporation · demo data</p>
      </div>
    </nav>
  )
}

function HeaderSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e) => {
    e.preventDefault()
    navigate(`/assets${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }
  return (
    <form onSubmit={submit} role="search" className="hidden w-full max-w-[380px] md:block">
      <label className="flex h-10 items-center gap-2.5 rounded-full border border-line bg-transparent px-4 text-ink-3 transition-colors focus-within:border-brand-500">
        <Search className="size-4 shrink-0" strokeWidth={1.75} />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets by code, name or ward"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-4 focus:outline-none" aria-label="Search assets"
        />
      </label>
    </form>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  useTabTitle()
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2)

  return (
    <div className="min-h-full bg-page lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-page lg:block"><Sidebar /></aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-page shadow-[var(--shadow-pop)]">
            <button className="absolute right-4 top-5 flex size-8 items-center justify-center rounded-full border border-line text-ink-3" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-4" /></button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 bg-page/85 px-4 backdrop-blur sm:px-6">
        <button className="flex size-9 items-center justify-center rounded-full border border-line text-ink-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-4" /></button>
        <Logo className="lg:hidden" />
        <HeaderSearch />
        <div className="ml-auto flex items-center gap-2.5">
          <ThemeToggle />
          <NotificationBell />
          <div className="flex h-11 items-center gap-2.5 rounded-full border border-line py-1 pl-1 pr-1 sm:pr-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-on-brand">{initials}</span>
            <div className="hidden pr-1 sm:block">
              <p className="text-[13px] font-medium leading-4 text-ink">{user.name}</p>
              <p className="text-[11px] leading-4 text-ink-3" title={user.designation}>{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
            <button
              onClick={async () => { await logout(); navigate('/login') }}
              className="flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-subtle hover:text-ink" aria-label="Sign out" title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="min-h-[calc(100vh-72px)] bg-canvas lg:rounded-tl-3xl">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
