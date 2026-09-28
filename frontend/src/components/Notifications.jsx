import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, AlertTriangle, Megaphone, Wrench, CircleCheck, Unplug, CheckCheck, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { relative } from '../lib/format'

const KIND = {
  DAMAGE: { icon: AlertTriangle, color: 'var(--color-bad)' },
  CITIZEN: { icon: Megaphone, color: 'var(--color-info)' },
  WORK_ORDER: { icon: Wrench, color: 'var(--color-brand-600)' },
  COMPLETED: { icon: CircleCheck, color: 'var(--color-ok)' },
  OUTAGE: { icon: Unplug, color: 'var(--color-warn)' },
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications'),
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
  })
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const { data } = useNotifications()
  const unread = data?.unread ?? 0

  // Toast anything that arrived since the last poll (not the backlog on first load)
  const seen = useRef(null)
  useEffect(() => {
    if (!data) return
    const ids = new Set(data.items.map((n) => n._id))
    if (seen.current) {
      data.items.filter((n) => !n.read && !seen.current.has(n._id)).slice(0, 3).forEach((n) =>
        toast(n.title, { description: n.message, action: n.link ? { label: 'Open', onClick: () => navigate(n.link) } : undefined }))
    }
    seen.current = ids
  }, [data, navigate])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const readAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) })
  const readOne = useMutation({ mutationFn: (id) => api.post(`/notifications/${id}/read`), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) })

  const openItem = (n) => {
    if (!n.read) readOne.mutate(n._id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog"
        className={`relative flex size-9 items-center justify-center rounded-full border transition-colors ${open ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line text-ink-3 hover:bg-subtle hover:text-ink'}`}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} title="Notifications"
      >
        <Bell className="size-4" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="tabular absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-star px-1 text-[10px] font-semibold text-white ring-2 ring-page">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[15px] font-semibold">Notifications</p>
              <p className="text-xs text-ink-3">{unread ? `${unread} unread` : 'You’re all caught up'}</p>
            </div>
            {unread > 0 && (
              <button onClick={() => readAll.mutate()} disabled={readAll.isPending} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3 text-xs text-ink-2 hover:bg-subtle hover:text-ink">
                <CheckCheck className="size-3.5" />Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[420px] overflow-y-auto border-t border-line p-1.5">
            {!data?.items.length ? (
              <li className="flex flex-col items-center px-6 py-10 text-center">
                <BellOff className="size-6 text-ink-4" strokeWidth={1.5} />
                <p className="mt-2 text-sm font-medium">No notifications yet</p>
                <p className="mt-0.5 text-xs text-ink-3">Damage reports, citizen complaints and outages will show up here.</p>
              </li>
            ) : data.items.map((n) => {
              const k = KIND[n.kind] ?? KIND.WORK_ORDER
              return (
                <li key={n._id}>
                  <button onClick={() => openItem(n)} className="flex w-full gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-subtle/60">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-subtle" style={{ color: k.color }}><k.icon className="size-4" strokeWidth={1.75} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`truncate text-[13px] ${n.read ? 'text-ink-2' : 'font-semibold text-ink'}`}>{n.title}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-ink-4">{relative(n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-[18px] text-ink-3">{n.message}</span>
                    </span>
                    {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
