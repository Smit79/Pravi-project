import { Asset, Notification } from '../models/index.js'

// Which activity events are worth interrupting staff for, and how to phrase them
const RULES = {
  STATUS_CHANGED: ({ meta }) => (meta.to === 'DAMAGED' ? { kind: 'DAMAGE', title: 'Asset marked damaged' } : null),
  WO_CREATED: ({ actor }) => (actor ? { kind: 'WORK_ORDER', title: 'New work order', link: '/work-orders' } : { kind: 'CITIZEN', title: 'New citizen complaint', link: '/work-orders' }),
  WO_COMPLETED: () => ({ kind: 'COMPLETED', title: 'Work order completed', link: '/work-orders' }),
  IMPACT: () => ({ kind: 'OUTAGE', title: 'Service outage downstream' }),
}

export async function notifyFromActivity({ asset, actor, action, message, meta = {} }, session) {
  const rule = RULES[action]?.({ actor, meta })
  if (!rule) return
  const a = asset ? await Asset.findById(asset).select('assetCode name').session(session ?? null).lean() : null
  await Notification.create([{
    kind: rule.kind,
    title: rule.title,
    message: a ? `${a.assetCode} · ${a.name} — ${message}` : message,
    link: rule.link ?? (asset ? `/assets/${asset}` : undefined),
    asset, actor,
  }], { session })
}
