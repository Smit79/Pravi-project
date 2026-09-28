import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Megaphone, MapPin, ImagePlus, X, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { CATEGORIES } from '../lib/constants'
import { Button, Field, Input, Textarea } from '../components/ui'
import { Logo } from '../components/AppLayout'
import { ThemeToggle } from '../context/ThemeContext'

const MAX_PHOTOS = 3
const MAX_EDGE = 1600

// Downscale and re-encode in the browser so phone photos (often 4–10 MB) upload as ~200–400 KB JPEGs
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} could not be read as an image`)) }
    img.src = url
  })
}

function PhotoPicker({ photos, onChange }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const add = async (files) => {
    setError('')
    const room = MAX_PHOTOS - photos.length
    const picked = [...files].filter((f) => f.type.startsWith('image/'))
    if (picked.length > room) setError(`You can attach up to ${MAX_PHOTOS} photos`)
    setBusy(true)
    try {
      const encoded = await Promise.all(picked.slice(0, room).map(compressImage))
      onChange([...photos, ...encoded])
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium text-ink">Photos <span className="font-normal text-ink-3">(optional, up to {MAX_PHOTOS})</span></span>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((src, i) => (
          <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-subtle">
            <img src={src} alt={`Attached photo ${i + 1}`} className="size-full object-cover" />
            <button type="button" onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white transition-opacity hover:bg-black">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-xs text-ink-3 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" strokeWidth={1.6} />}
            {busy ? 'Processing…' : 'Add photo'}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
      {error ? <span className="mt-1 block text-xs text-bad">{error}</span> : <span className="mt-1 block text-xs text-ink-3">A clear photo helps the crew find and fix the problem faster.</span>}
    </div>
  )
}

// Public page (no login): citizens report a fault on an asset using the code on its tag.
export default function ReportIssue() {
  const [form, setForm] = useState({ assetCode: new URLSearchParams(window.location.search).get('asset') ?? '', description: '', reporterPhone: '', photos: [] })
  useEffect(() => { document.title = 'Report a problem · Pravi' }, [])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const m = useMutation({ mutationFn: () => api.post('/public/report', form) })
  // Confirm which asset is being reported (e.g. after scanning its QR tag)
  const code = form.assetCode.trim().toUpperCase()
  const lookup = useQuery({
    queryKey: ['public-asset', code],
    queryFn: () => api.get(`/public/assets/${code}`),
    enabled: /^[A-Z]{3}-\d{4}$/.test(code),
    retry: false,
  })
  const found = lookup.data?.asset
  const FoundIcon = found && CATEGORIES[found.category]?.icon

  return (
    <div className="relative flex min-h-full flex-col items-center bg-page px-4 py-10" style={{ backgroundImage: 'radial-gradient(60% 45% at 50% 0%, color-mix(in srgb, var(--color-brand-deep) 22%, transparent), transparent 70%)' }}>
      <ThemeToggle className="absolute right-4 top-4" />
      <Logo className="mb-8 scale-110" />
      <div className="w-full max-w-[480px] rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-pop)] sm:p-8">
        {m.isSuccess ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-ok" strokeWidth={1.5} />
            <h1 className="mt-4 text-lg font-semibold">Complaint registered</h1>
            <p className="mt-1 text-sm text-ink-3">Your tracking number</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-brand-700">{m.data.trackingNumber}</p>
            <p className="mt-4 text-sm text-ink-2">The Navpur Municipal Corporation maintenance team has been notified.</p>
            <Button variant="secondary" className="mt-6" onClick={() => { m.reset(); setForm({ assetCode: '', description: '', reporterPhone: '', photos: [] }) }}>Report another issue</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full border border-line bg-subtle text-brand-600"><Megaphone className="size-5" /></span>
              <div>
                <h1 className="text-lg font-semibold">Report a problem</h1>
                <p className="text-sm text-ink-3">Broken street light, damaged road, faulty signal…</p>
              </div>
            </div>
            <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
              <Field label="Asset code" hint="Printed on the tag attached to the pole or structure, e.g. STL-0007">
                <Input required value={form.assetCode} onChange={set('assetCode')} placeholder="STL-0007" className="font-mono uppercase" />
              </Field>
              {found && (
                <div className="flex items-start gap-3 rounded-xl border border-ok/30 bg-ok-bg px-3 py-2.5">
                  {FoundIcon && <FoundIcon className="mt-0.5 size-5 shrink-0 text-ok" strokeWidth={1.75} />}
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold text-ink">{found.name}</p>
                    <p className="flex items-center gap-1 text-xs text-ink-3"><MapPin className="size-3" />{found.address}</p>
                  </div>
                </div>
              )}
              {lookup.isError && <p className="-mt-2 text-xs text-bad">No active asset found with code {code}. Check the tag and try again.</p>}
              <Field label="What is the problem?"><Textarea required minLength={10} value={form.description} onChange={set('description')} placeholder="The light has not been working for 3 nights." /></Field>
              <PhotoPicker photos={form.photos} onChange={(photos) => setForm((f) => ({ ...f, photos }))} />
              <Field label="Mobile number (optional)" hint="Only used to update you on the repair."><Input inputMode="numeric" maxLength={10} value={form.reporterPhone} onChange={set('reporterPhone')} placeholder="9876543210" /></Field>
              {m.isError && <p className="rounded-xl bg-bad-bg px-3 py-2 text-sm text-bad" role="alert">{m.error.message}</p>}
              <Button type="submit" size="lg" className="w-full" loading={m.isPending}>Submit report</Button>
            </form>
          </>
        )}
      </div>
      <p className="mt-6 text-xs text-ink-3">Navpur Municipal Corporation (demo) · Powered by Pravi</p>
    </div>
  )
}
