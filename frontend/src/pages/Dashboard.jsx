import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Boxes, Activity, AlertTriangle, ClipboardX, Wrench, HeartPulse, ArrowRight, CircleCheck, Unplug, MoreVertical } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, STATUS, healthBand } from '../lib/constants'
import { formatINRCompact, formatINR } from '../lib/format'
import { AssetCode, Card, CardHeader, EmptyState, ErrorState, HealthBar, PageHeader, Skeleton, StatusBadge } from '../components/ui'

const TONE = {
  ok: 'border-ok/40 text-ok',
  warn: 'border-warn/40 text-warn',
  bad: 'border-bad/40 text-bad',
  neutral: 'border-line-strong text-ink-3',
}

function Kpi({ label, value, chip, tone = 'neutral', icon: Icon, to }) {
  return (
    <Link to={to} className="group flex flex-col rounded-2xl border border-line/60 bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-line-strong">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full border border-line bg-subtle text-ink-2"><Icon className="size-[18px]" strokeWidth={1.6} /></span>
        <p className="text-[15px] font-medium text-ink">{label}</p>
        <MoreVertical className="ml-auto size-4 text-ink-4" aria-hidden />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="tabular text-[30px] font-semibold leading-none tracking-[-0.03em]">{value}</p>
        <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-medium ${TONE[tone]}`}>{chip}</span>
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-ink-3">
        <span className="transition-colors group-hover:text-ink">See more</span>
        <ArrowRight className="size-4 text-ink-2 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

// Static range label shown in card headers (mirrors the reference's "Last month" pill)
const RangePill = ({ children }) => (
  <span className="inline-flex h-8 items-center rounded-full border border-line-strong px-3.5 text-xs text-ink-2">{children}</span>
)

const HeaderLink = ({ to, children }) => (
  <Link to={to} className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong px-3.5 text-xs text-ink-2 transition-colors hover:bg-subtle hover:text-ink">
    {children}<ArrowRight className="size-3.5" />
  </Link>
)

// Dark floating tooltip with a coloured swatch per series
function ChartTooltip({ active, payload, label, series }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="min-w-[150px] rounded-xl border border-line bg-subtle px-3.5 py-2.5 text-xs shadow-[var(--shadow-pop)]">
      <p className="mb-1.5 text-[13px] font-semibold text-ink">{label}</p>
      {series.map((s) => (
        <p key={s.key} className="flex items-center gap-2 py-0.5 text-ink-2">
          <span className="size-2.5 rounded-full" style={{ background: s.swatch }} />
          {s.name}
          <span className="tabular ml-auto pl-3 font-medium text-ink">{s.fmt ? s.fmt(row[s.key], row) : row[s.key]}</span>
        </p>
      ))}
    </div>
  )
}

const Legend = ({ items }) => (
  <div className="flex flex-wrap gap-4 px-5 text-xs text-ink-2">
    {items.map(([label, swatch]) => (
      <span key={label} className="flex items-center gap-2"><span className="h-2.5 w-5 rounded-sm" style={{ background: swatch }} />{label}</span>
    ))}
  </div>
)

const axis = { fontSize: 11, fill: 'var(--color-ink-3)' }
const HATCH_SWATCH = 'repeating-linear-gradient(135deg, var(--color-ink-3) 0 1.5px, var(--color-subtle) 1.5px 4px)'

function HatchDefs() {
  return (
    <defs>
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" style={{ fill: 'var(--color-subtle)' }} />
        <line x1="0" y1="0" x2="0" y2="6" strokeWidth="2" className="hatch-line" />
      </pattern>
      <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: 'var(--color-brand-deep)', stopOpacity: 0.55 }} />
        <stop offset="100%" style={{ stopColor: 'var(--color-brand-deep)', stopOpacity: 0 }} />
      </linearGradient>
    </defs>
  )
}

const ListSkeleton = ({ n = 4, h = 'h-10' }) => <div className="space-y-2 px-5 pb-5">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className={h} />)}</div>

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard') })
  const attention = useQuery({ queryKey: ['attention'], queryFn: () => api.get('/assets/attention') })
  const impact = useQuery({ queryKey: ['impact'], queryFn: () => api.get('/impact') })
  const d = dash.data
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const statusTotal = d ? d.byStatus.reduce((a, s) => a + s.count, 0) : 0

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(' ')[0]}`}
        description={`Navpur Municipal Corporation · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      />
      {dash.isError ? <Card><ErrorState error={dash.error} onRetry={dash.refetch} /></Card> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {!d ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[158px] rounded-2xl" />) : <>
              <Kpi label="Total assets" value={d.kpis.totalAssets} chip="Excl. retired" icon={Boxes} to="/assets" />
              <Kpi label="Operational availability" value={`${d.kpis.operationalPct}%`} chip={`${d.kpis.underMaintenance} in maintenance`} tone={d.kpis.operationalPct >= 80 ? 'ok' : 'warn'} icon={Activity} to="/assets?status=UNDER_MAINTENANCE,DAMAGED" />
              <Kpi label="Damaged assets" value={d.kpis.damaged} chip={d.kpis.damaged ? 'Need repair' : 'None'} tone={d.kpis.damaged ? 'bad' : 'ok'} icon={AlertTriangle} to="/assets?status=DAMAGED" />
              <Kpi label="Inspections overdue" value={d.kpis.inspectionsOverdue} chip={d.kpis.inspectionsOverdue ? 'Past due date' : 'On schedule'} tone={d.kpis.inspectionsOverdue ? 'warn' : 'ok'} icon={ClipboardX} to="/assets?overdue=1" />
              <Kpi label="Open work orders" value={d.kpis.openWorkOrders} chip="Open + in progress" icon={Wrench} to="/work-orders" />
              <Kpi label="Average health" value={d.kpis.avgHealth} chip={`${healthBand(d.kpis.avgHealth).label} · of 100`} tone={d.kpis.avgHealth >= 70 ? 'ok' : d.kpis.avgHealth >= 40 ? 'warn' : 'bad'} icon={HeartPulse} to="/assets?sort=healthScore" />
            </>}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-8">
              <CardHeader title="Assets vs health by ward" action={<RangePill>All wards</RangePill>} />
              <Legend items={[['Assets', 'var(--color-brand-600)'], ['Avg health', HATCH_SWATCH]]} />
              <div className="h-[280px] px-3 pb-4 pt-2">
                {!d ? <Skeleton className="h-full" /> : (
                  <ResponsiveContainer>
                    <BarChart data={d.byWard} margin={{ left: 0, right: 0, top: 16 }} barGap={6}>
                      <HatchDefs />
                      <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="0" />
                      <XAxis dataKey="ward" tick={axis} axisLine={false} tickLine={false} interval={0} tickFormatter={(w) => w.split(' ')[0]} />
                      <YAxis yAxisId="count" tick={axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                      <YAxis yAxisId="health" orientation="right" domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} width={32} />
                      <Tooltip cursor={{ fill: 'var(--color-subtle)', opacity: 0.5, radius: 8 }} content={<ChartTooltip series={[
                        { key: 'count', name: 'Assets', swatch: 'var(--color-brand-600)' },
                        { key: 'avgHealth', name: 'Avg health', swatch: 'var(--color-ink-3)' },
                      ]} />} />
                      <Bar yAxisId="count" isAnimationActive={false} dataKey="count" name="Assets" fill="var(--color-brand-600)" activeBar={{ fill: 'var(--color-brand-deep)' }} radius={[6, 6, 6, 6]} maxBarSize={22}
                        className="cursor-pointer" onClick={(e) => navigate(`/assets?ward=${encodeURIComponent(e.ward ?? e.payload?.ward)}`)} />
                      <Bar yAxisId="health" isAnimationActive={false} dataKey="avgHealth" name="Avg health" fill="url(#hatch)" stroke="var(--color-line-strong)" radius={[6, 6, 6, 6]} maxBarSize={22}
                        className="cursor-pointer" onClick={(e) => navigate(`/assets?ward=${encodeURIComponent(e.ward ?? e.payload?.ward)}`)} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="xl:col-span-4">
              <CardHeader title="Lifecycle status" action={<RangePill>All assets</RangePill>} />
              {!d ? <div className="px-5 pb-5"><Skeleton className="h-[280px]" /></div> : (
                <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-center xl:flex-col xl:items-stretch 2xl:flex-row 2xl:items-center">
                  <div className="relative mx-auto h-[170px] w-[170px] shrink-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie isAnimationActive={false} data={d.byStatus} dataKey="count" nameKey="status" innerRadius="64%" outerRadius="100%" paddingAngle={3} cornerRadius={6} stroke="none"
                          onClick={(e) => navigate(`/assets?status=${e.status ?? e.payload?.status}`)} className="cursor-pointer">
                          {d.byStatus.map((s) => <Cell key={s.status} fill={STATUS[s.status]?.pin} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="tabular text-2xl font-semibold leading-none">{statusTotal}</span>
                      <span className="mt-1 text-[11px] text-ink-3">assets</span>
                    </div>
                  </div>
                  <ul className="flex-1 space-y-3">
                    {Object.keys(STATUS).map((k) => {
                      const c = d.byStatus.find((s) => s.status === k)?.count ?? 0
                      return (
                        <li key={k}>
                          <Link to={`/assets?status=${k}`} className="group block">
                            <span className="flex items-center justify-between text-[13px]">
                              <span className="text-ink-2 group-hover:text-ink">{STATUS[k].label}</span>
                              <span className="tabular text-xs font-medium">{c}</span>
                            </span>
                            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-subtle">
                              <span className="block h-full rounded-full" style={{ width: `${statusTotal ? (c / statusTotal) * 100 : 0}%`, background: STATUS[k].pin }} />
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </Card>

            <Card className="xl:col-span-5">
              <CardHeader title="Needs attention" subtitle="Poor health, overdue inspection or expiring warranty" action={<HeaderLink to="/assets?sort=healthScore">View all</HeaderLink>} />
              {attention.isLoading ? <ListSkeleton />
                : !attention.data?.items.length ? <EmptyState icon={CircleCheck} title="All clear" body="No assets currently need attention." />
                : (
                  <ul className="space-y-1 px-2 pb-3">
                    {attention.data.items.slice(0, 7).map((a) => (
                      <li key={a._id}>
                        <button onClick={() => navigate(`/assets/${a._id}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-subtle/60">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium"><AssetCode>{a.assetCode}</AssetCode> <span className="ml-1">{a.name}</span></p>
                            <p className="mt-0.5 truncate text-xs text-bad">{a.reasons.join(' · ')}</p>
                          </div>
                          <HealthBar score={a.healthScore} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </Card>

            <Card className="xl:col-span-7">
              <CardHeader
                title="Maintenance spend"
                subtitle={d && <>Completed work orders · <span className="tabular font-medium text-ink">{formatINR(d.costByMonth.reduce((a, m) => a + m.cost, 0))}</span></>}
                action={<RangePill>Last 6 months</RangePill>}
              />
              <div className="h-[300px] px-3 pb-4">
                {!d ? <Skeleton className="h-full" /> : (
                  <ResponsiveContainer>
                    <AreaChart data={d.costByMonth} margin={{ left: 0, right: 12, top: 12 }}>
                      <HatchDefs />
                      <CartesianGrid vertical={false} stroke="var(--color-line)" />
                      <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
                      <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={formatINRCompact} width={64} />
                      <Tooltip cursor={{ stroke: 'var(--color-ink-4)', strokeDasharray: '3 3' }} content={<ChartTooltip series={[
                        { key: 'cost', name: 'Spend', swatch: 'var(--color-brand-600)', fmt: (v) => formatINR(v) },
                        { key: 'count', name: 'Jobs', swatch: 'var(--color-ink-3)' },
                      ]} />} />
                      <Area isAnimationActive={false} type="monotone" dataKey="cost" stroke="var(--color-brand-600)" strokeWidth={2} fill="url(#spendFill)"
                        activeDot={{ r: 5, fill: 'var(--color-brand-600)', stroke: 'var(--color-surface)', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="xl:col-span-5">
              <CardHeader title="Service impact" subtitle="Failed assets and the dependent assets they take down" action={impact.data && <span className="inline-flex h-8 items-center whitespace-nowrap rounded-full border border-warn/40 px-3.5 text-xs font-medium text-warn">{impact.data.totalImpacted} affected</span>} />
              {impact.isLoading ? <ListSkeleton n={3} h="h-14" />
                : !impact.data?.groups.length ? <EmptyState icon={CircleCheck} title="No knock-on outages" body="All upstream assets (feeder pillars, bridges, pumps) are in service." />
                : (
                  <ul className="space-y-2 px-3 pb-4">
                    {impact.data.groups.map(({ provider: p, affected }) => (
                      <li key={p._id} className="rounded-xl border border-line/70 px-3.5 py-3">
                        <button onClick={() => navigate(`/assets/${p._id}?tab=dependencies`)} className="flex w-full items-center gap-2 text-left">
                          <Unplug className="size-4 shrink-0 text-bad" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium"><AssetCode>{p.assetCode}</AssetCode> <span className="ml-1">{p.name}</span></span>
                          <StatusBadge status={p.status} />
                        </button>
                        <p className="mt-1.5 pl-6 text-xs text-ink-3">
                          Affects <strong className="text-ink">{affected.length}</strong> {affected.length === 1 ? 'asset' : 'assets'}: {affected.slice(0, 6).map((x) => x.assetCode).join(', ')}{affected.length > 6 ? '…' : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
            </Card>

            <Card className="xl:col-span-7">
              <CardHeader title="Assets by category" subtitle="Click a bar to open the filtered list" />
              <div className="h-[280px] px-3 pb-4">
                {!d ? <Skeleton className="h-full" /> : (
                  <ResponsiveContainer>
                    <BarChart data={d.byCategory.map((c) => ({ ...c, name: CATEGORIES[c.category]?.label }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" hide allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={150} />
                      <Tooltip cursor={false} content={<ChartTooltip series={[{ key: 'count', name: 'Assets', swatch: 'var(--color-brand-600)' }]} />} labelFormatter={(l) => l} />
                      <Bar isAnimationActive={false} dataKey="count" name="Assets" fill="var(--color-brand-600)" activeBar={{ fill: 'var(--color-brand-deep)' }} background={{ fill: 'var(--color-subtle)', radius: 999 }}
                        radius={999} barSize={14} className="cursor-pointer" onClick={(e) => navigate(`/assets?category=${e.category ?? e.payload?.category}`)} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
