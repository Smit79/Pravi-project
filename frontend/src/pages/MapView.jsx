import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X, ArrowRight, MapPin, TriangleAlert, RotateCcw, Layers } from 'lucide-react'
import { api } from '../lib/api'
import { CATEGORIES, STATUS } from '../lib/constants'
import AssetMap, { IMPACT_RING, HEALTH_LEGEND, pinColor } from '../components/AssetMap'
import { AssetCode, ErrorState, HealthBar, PageHeader, Skeleton, StatusBadge } from '../components/ui'

const DEFAULT_STATUSES = ['PLANNED', 'ACTIVE', 'UNDER_MAINTENANCE', 'DAMAGED']
const glass = 'rounded-2xl border border-line bg-surface/90 shadow-[var(--shadow-pop)] backdrop-blur-md'

function Stat({ label, value, tone }) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-xs text-ink-3">
      {tone && <span className="size-2 rounded-full" style={{ background: tone }} />}
      {label}<span className="tabular text-sm font-semibold text-ink">{value}</span>
    </span>
  )
}

function FilterPanel({ items, q, setQ, cats, setCats, statuses, setStatuses, onClose }) {
  const toggle = (set, setter, key) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    setter(next)
  }
  // Counts reflect the other active filters, so each row shows what enabling it would add
  const catCount = (k) => items.filter((a) => a.category === k && statuses.has(a.status)).length
  const statusCount = (k) => items.filter((a) => a.status === k && cats.has(a.category)).length
  const dirty = q || cats.size !== Object.keys(CATEGORIES).length || statuses.size !== DEFAULT_STATUSES.length || !DEFAULT_STATUSES.every((s) => statuses.has(s))

  return (
    <div className={`${glass} flex max-h-full w-[300px] flex-col overflow-hidden`}>
      <div className="flex items-center gap-2 p-3">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-full border border-line bg-subtle/60 px-3.5 text-ink-3 focus-within:border-brand-500">
          <Search className="size-4 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, name or ward" aria-label="Filter assets on map"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-4 focus:outline-none" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search"><X className="size-3.5" /></button>}
        </label>
        {onClose && <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full border border-line text-ink-3 hover:text-ink" aria-label="Hide filters"><X className="size-4" /></button>}
      </div>
      <div className="overflow-y-auto px-3 pb-3">
        <p className="px-1.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-ink-4">Categories</p>
        <ul className="space-y-0.5">
          {Object.entries(CATEGORIES).map(([k, c]) => {
            const on = cats.has(k)
            return (
              <li key={k}>
                <button onClick={() => toggle(cats, setCats, k)} aria-pressed={on}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[13px] transition-colors ${on ? 'text-ink hover:bg-subtle/60' : 'text-ink-4 hover:bg-subtle/40'}`}>
                  <span className={`flex size-7 items-center justify-center rounded-full border ${on ? 'border-brand-500/40 bg-brand-50 text-brand-700' : 'border-line text-ink-4'}`}><c.icon className="size-3.5" strokeWidth={1.75} /></span>
                  <span className="flex-1 truncate">{c.label}</span>
                  <span className="tabular text-xs text-ink-3">{catCount(k)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="px-1.5 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-wider text-ink-4">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(STATUS).map(([k, s]) => {
            const on = statuses.has(k)
            return (
              <button key={k} onClick={() => toggle(statuses, setStatuses, k)} aria-pressed={on}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors ${on ? 'border-line-strong bg-subtle text-ink' : 'border-line text-ink-4 hover:text-ink-2'}`}>
                <span className="size-2 rounded-full" style={{ background: on ? s.pin : 'var(--color-ink-4)' }} />{s.label}
                <span className="tabular text-ink-3">{statusCount(k)}</span>
              </button>
            )
          })}
        </div>
        {dirty && (
          <button onClick={() => { setQ(''); setCats(new Set(Object.keys(CATEGORIES))); setStatuses(new Set(DEFAULT_STATUSES)) }}
            className="mt-4 inline-flex items-center gap-1.5 px-1.5 text-xs font-medium text-brand-700 hover:underline">
            <RotateCcw className="size-3" />Reset filters
          </button>
        )}
      </div>
    </div>
  )
}

function AssetPanel({ asset: a, mode, onClose }) {
  const Icon = CATEGORIES[a.category]?.icon ?? MapPin
  return (
    <div className={`${glass} w-full p-4 sm:w-[320px]`} role="region" aria-label={`Selected asset ${a.assetCode}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-subtle" style={{ color: pinColor(a, mode) }}><Icon className="size-5" strokeWidth={1.6} /></span>
        <div className="min-w-0 flex-1">
          <AssetCode>{a.assetCode}</AssetCode>
          <p className="mt-0.5 text-[15px] font-semibold leading-5 text-ink">{a.name}</p>
          <p className="mt-0.5 text-xs text-ink-3">{CATEGORIES[a.category]?.label} · {a.ward}</p>
        </div>
        <button onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-3 hover:bg-subtle hover:text-ink" aria-label="Close"><X className="size-4" /></button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-subtle/60 px-3 py-2.5">
          <p className="text-[11px] text-ink-3">Status</p>
          <div className="mt-1"><StatusBadge status={a.status} /></div>
        </div>
        <div className="rounded-xl bg-subtle/60 px-3 py-2.5">
          <p className="text-[11px] text-ink-3">Health</p>
          <div className="mt-1.5"><HealthBar score={a.healthScore} /></div>
        </div>
      </div>
      {a.impactedBy && (
        <p className="mt-2 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn-bg px-3 py-2 text-xs text-warn">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span>No service: upstream <strong>{a.impactedBy.assetCode}</strong> ({a.impactedBy.name}) is {a.impactedBy.status.replace('_', ' ').toLowerCase()}.</span>
        </p>
      )}
      <Link to={`/assets/${a._id}`} className="mt-4 flex h-10 items-center justify-center gap-1.5 rounded-full bg-brand-600 text-sm font-medium text-on-brand transition-colors hover:bg-brand-500">
        Open asset<ArrowRight className="size-4" />
      </Link>
    </div>
  )
}

export default function MapView() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['map'], queryFn: () => api.get('/assets/map?includeRetired=1') })
  const [mode, setMode] = useState('status')
  const [q, setQ] = useState('')
  const [cats, setCats] = useState(() => new Set(Object.keys(CATEGORIES)))
  const [statuses, setStatuses] = useState(() => new Set(DEFAULT_STATUSES))
  const [selectedId, setSelectedId] = useState(null)
  const [showFilters, setShowFilters] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  const [showLegend, setShowLegend] = useState(true)

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (data?.items ?? []).filter((a) => !needle || `${a.assetCode} ${a.name} ${a.ward}`.toLowerCase().includes(needle))
  }, [data, q])
  const visible = useMemo(() => items.filter((a) => cats.has(a.category) && statuses.has(a.status)), [items, cats, statuses])
  const selected = visible.find((a) => a._id === selectedId) ?? null
  const impacted = visible.filter((a) => a.impactedBy).length
  const damaged = visible.filter((a) => a.status === 'DAMAGED').length
  const legend = mode === 'status' ? Object.values(STATUS).map((s) => [s.label, s.pin]) : HEALTH_LEGEND

  return (
    <>
      <PageHeader
        title="Map"
        description="Every registered asset across Navpur. Click a pin for details."
        actions={data && <>
          <Stat label="Shown" value={`${visible.length}/${data.items.length}`} />
          <Stat label="Damaged" value={damaged} tone={STATUS.DAMAGED.pin} />
          {impacted > 0 && <Stat label="Without service" value={impacted} tone={IMPACT_RING} />}
        </>}
      />
      <div className="relative h-[calc(100vh-210px)] min-h-[480px] overflow-hidden rounded-3xl border border-line/60 bg-surface">
        {isError ? <ErrorState error={error} onRetry={refetch} />
          : isLoading ? <Skeleton className="h-full rounded-none" />
          : <AssetMap assets={visible} mode={mode} onSelect={(a) => setSelectedId(a?._id ?? null)} selectedId={selected?._id} />}

        {data && <>
          {/* Filters: floating panel, top-left */}
          <div className="pointer-events-none absolute inset-y-4 left-4 z-[500] flex flex-col items-start">
            <div className="pointer-events-auto max-h-full">
              {showFilters
                ? <FilterPanel items={items} q={q} setQ={setQ} cats={cats} setCats={setCats} statuses={statuses} setStatuses={setStatuses} onClose={() => setShowFilters(false)} />
                : (
                  <button onClick={() => setShowFilters(true)} className={`${glass} inline-flex h-10 items-center gap-2 px-4 text-sm font-medium text-ink`}>
                    <SlidersHorizontal className="size-4" />Filters
                    <span className="tabular rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{visible.length}</span>
                  </button>
                )}
            </div>
          </div>

          {/* Colour mode + legend: top-right */}
          <div className="absolute right-4 top-4 z-[500] flex flex-col items-end gap-2">
            <div className={`${glass} flex rounded-full p-1`} role="group" aria-label="Colour pins by">
              {['status', 'health'].map((m) => (
                <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${mode === m ? 'bg-brand-600 text-on-brand' : 'text-ink-3 hover:text-ink'}`}>{m}</button>
              ))}
              <button onClick={() => setShowLegend((s) => !s)} aria-pressed={showLegend} aria-label="Toggle legend" title="Legend"
                className={`ml-1 flex size-8 items-center justify-center rounded-full transition-colors ${showLegend ? 'bg-subtle text-ink' : 'text-ink-3 hover:text-ink'}`}>
                <Layers className="size-4" />
              </button>
            </div>
            {showLegend && !selected && (
              <div className={`${glass} w-[210px] p-3.5 text-xs`}>
                <p className="mb-2 font-semibold text-ink">{mode === 'status' ? 'Lifecycle status' : 'Health score'}</p>
                {legend.map(([l, c]) => (
                  <p key={l} className="flex items-center gap-2 py-0.5 text-ink-2"><span className="size-2.5 rounded-full" style={{ background: c }} />{l}</p>
                ))}
                <p className="flex items-center gap-2 py-0.5 text-ink-2"><span className="size-2.5 rounded-full border-2 border-dashed" style={{ borderColor: IMPACT_RING }} />No service (upstream)</p>
                <p className="mt-2 border-t border-line pt-2 text-ink-4">Larger pins: bridges, pumps, buildings, feeder pillars</p>
              </div>
            )}
          </div>

          {/* Selected asset: right side on desktop, bottom sheet on mobile */}
          {selected && (
            <div className="absolute inset-x-4 bottom-4 z-[600] sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[64px]">
              <AssetPanel asset={selected} mode={mode} onClose={() => setSelectedId(null)} />
            </div>
          )}

          {visible.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
              <div className={`${glass} px-5 py-4 text-center`}>
                <p className="text-sm font-medium">No assets match these filters</p>
                <p className="mt-0.5 text-xs text-ink-3">Try clearing the search or enabling more categories.</p>
              </div>
            </div>
          )}
        </>}
      </div>
    </>
  )
}
