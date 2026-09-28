import { Router } from 'express'
import mongoose from 'mongoose'
import { Notification, Photo } from '../models/index.js'
import { auth } from '../middleware/auth.js'
import { ah, HttpError } from '../middleware/errors.js'

const router = Router()

// Staff don't get notified about their own actions
const visibleTo = (user) => ({ actor: { $ne: user._id } })

router.get('/notifications', auth, ah(async (req, res) => {
  const filter = visibleTo(req.user)
  const [items, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(30).select('-actor').lean(),
    Notification.countDocuments({ ...filter, readBy: { $ne: req.user._id } }),
  ])
  res.json({
    unread,
    items: items.map(({ readBy, ...n }) => ({ ...n, read: readBy.some((id) => id.equals(req.user._id)) })),
  })
}))

router.post('/notifications/read-all', auth, ah(async (req, res) => {
  await Notification.updateMany({ ...visibleTo(req.user), readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } })
  res.status(204).end()
}))

router.post('/notifications/:id/read', auth, ah(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Notification not found')
  await Notification.updateOne({ _id: req.params.id }, { $addToSet: { readBy: req.user._id } })
  res.status(204).end()
}))

// Citizen report photos are only visible to signed-in staff
router.get('/photos/:id', auth, ah(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Photo not found')
  const photo = await Photo.findById(req.params.id)
  if (!photo) throw new HttpError(404, 'Photo not found')
  res.set('Cache-Control', 'private, max-age=86400').type(photo.contentType).send(photo.data)
}))

export default router
