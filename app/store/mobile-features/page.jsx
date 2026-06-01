'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { BellIcon, ImageIcon, Smartphone, GiftIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'

const MAX_SLIDES = 8
const MAX_IMAGE_SIZE_MB = 5

const emptySlide = () => ({
  image: '',
  link: '/offers',
  title: '',
})

const SLICE_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6',
]

const emptySlice = (idx = 0) => ({
  label: '',
  weight: 10,
  rewardType: 'no_win',
  discountValue: 0,
  minOrderValue: 0,
  expiryHours: 48,
  color: SLICE_COLORS[idx % SLICE_COLORS.length],
})

export default function MobileFeaturesPage() {
  const { getToken } = useAuth()

  // --- Banner slider state ---
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [slides, setSlides] = useState([emptySlide()])

  // --- Spin wheel state ---
  const [spinLoading, setSpinLoading] = useState(true)
  const [spinSaving, setSpinSaving] = useState(false)
  const [spinMessage, setSpinMessage] = useState('')
  const [spinEnabled, setSpinEnabled] = useState(false)
  const [campaignName, setCampaignName] = useState('Spin & Win')
  const [couponPrefix, setCouponPrefix] = useState('SPIN')
  const [dailySpinLimit, setDailySpinLimit] = useState(1)
  const [spinSlices, setSpinSlices] = useState([
    { ...emptySlice(0), label: 'Better Luck Next Time', weight: 40, rewardType: 'no_win' },
    { ...emptySlice(1), label: '5% Off', weight: 25, rewardType: 'coupon_percent', discountValue: 5 },
    { ...emptySlice(2), label: '10% Off', weight: 15, rewardType: 'coupon_percent', discountValue: 10 },
    { ...emptySlice(3), label: '₹50 Off', weight: 10, rewardType: 'coupon_flat', discountValue: 50, minOrderValue: 300 },
    { ...emptySlice(4), label: 'Better Luck Next Time', weight: 10, rewardType: 'no_win' },
  ])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = await getToken()
        if (!token) { setLoading(false); return }

        const { data } = await axios.get('/api/store/mobile-banner-slider', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (typeof data?.enabled === 'boolean') setEnabled(data.enabled)

        if (Array.isArray(data?.slides) && data.slides.length > 0) {
          setSlides(data.slides.map((slide) => ({
            image: slide.image || '',
            link: slide.link || '/offers',
            title: slide.title || '',
          })))
        }
      } catch (err) {
        console.error('Failed to load mobile banner slider settings', err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [getToken])

  // Load spin campaign
  useEffect(() => {
    const loadSpin = async () => {
      try {
        const token = await getToken()
        if (!token) { setSpinLoading(false); return }

        const { data } = await axios.get('/api/store/spin-campaign', {
          headers: { Authorization: `Bearer ${token}` },
        })

        const c = data?.campaign
        if (c) {
          setSpinEnabled(!!c.isEnabled)
          setCampaignName(c.campaignName || 'Spin & Win')
          setCouponPrefix(c.couponPrefix || 'SPIN')
          setDailySpinLimit(c.dailySpinLimit || 1)
          if (Array.isArray(c.slices) && c.slices.length > 0) setSpinSlices(c.slices)
        }
      } catch (err) {
        console.error('Failed to load spin campaign settings', err)
      } finally {
        setSpinLoading(false)
      }
    }
    loadSpin()
  }, [getToken])

  // Banner helpers
  const updateSlide = (idx, patch) =>
    setSlides((prev) => prev.map((slide, i) => (i === idx ? { ...slide, ...patch } : slide)))

  const addSlide = () => {
    if (slides.length >= MAX_SLIDES) return
    setSlides((prev) => [...prev, emptySlide()])
  }

  const removeSlide = (idx) => {
    if (slides.length <= 1) return
    setSlides((prev) => prev.filter((_, i) => i !== idx))
  }

  const uploadSlideImage = async (idx, file) => {
    if (!file) return
    setMessage('')

    try {
      if (!file.type?.startsWith('image/')) {
        throw new Error('Please upload a valid image file')
      }

      const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024
      if (file.size > maxBytes) {
        throw new Error(`Image too large. Max ${MAX_IMAGE_SIZE_MB}MB allowed`)
      }

      const token = await getToken()
      if (!token) {
        throw new Error('Please sign in again and try upload')
      }

      const formData = new FormData()
      formData.append('image', file)
      formData.append('type', 'banner')

      const { data } = await axios.post('/api/store/upload-image', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      if (!data?.url) {
        throw new Error('Upload failed')
      }

      updateSlide(idx, { image: data.url })
    } catch (err) {
      setMessage(err?.response?.data?.error || err?.message || 'Failed to upload image')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const sanitizedSlides = slides
        .map((slide) => ({
          image: String(slide.image || '').trim(),
          link: String(slide.link || '/offers').trim() || '/offers',
          title: String(slide.title || '').trim(),
        }))
        .filter((slide) => slide.image)

      if (sanitizedSlides.length === 0) {
        throw new Error('Upload at least one banner image before saving')
      }

      const token = await getToken()
      if (!token) {
        throw new Error('Please sign in again and try save')
      }

      await axios.post(
        '/api/store/mobile-banner-slider',
        {
          enabled,
          slides: sanitizedSlides,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      setMessage('Mobile banner slider settings saved successfully!')
    } catch (err) {
      setMessage(err?.response?.data?.error || err?.message || 'Failed to save settings')
    }

    setSaving(false)
  }

  // Spin wheel helpers
  const updateSpinSlice = (idx, patch) =>
    setSpinSlices((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))

  const addSpinSlice = () => {
    if (spinSlices.length >= 12) return
    setSpinSlices((prev) => [...prev, emptySlice(prev.length)])
  }

  const removeSpinSlice = (idx) => {
    if (spinSlices.length <= 2) return
    setSpinSlices((prev) => prev.filter((_, i) => i !== idx))
  }

  const totalWeight = spinSlices.reduce((sum, s) => sum + (Number(s.weight) || 0), 0)

  const handleSpinSave = async (e) => {
    e.preventDefault()
    setSpinSaving(true)
    setSpinMessage('')
    try {
      const token = await getToken()
      if (!token) throw new Error('Please sign in again')
      if (spinSlices.length < 2) throw new Error('Add at least 2 slices')
      if (totalWeight <= 0) throw new Error('Total slice weight must be greater than 0')
      if (spinSlices.find((s) => !s.label.trim())) throw new Error('All slices must have a label')

      await axios.post(
        '/api/store/spin-campaign',
        { isEnabled: spinEnabled, campaignName, couponPrefix, dailySpinLimit, slices: spinSlices },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSpinMessage('Spin wheel campaign saved successfully!')
    } catch (err) {
      setSpinMessage(err?.response?.data?.error || err?.message || 'Failed to save spin campaign')
    }
    setSpinSaving(false)
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mobile Features</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage mobile application specific features from this dashboard section.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/store/app-notifications"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
        >
          <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-2 text-slate-700">
            <BellIcon size={18} />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Push Notifications</h2>
          <p className="mt-1 text-sm text-slate-600">Send push notifications to mobile app users.</p>
        </Link>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <div className="mb-3 inline-flex rounded-lg bg-white p-2 text-slate-500">
            <Smartphone size={18} />
          </div>
          <h2 className="text-base font-semibold text-slate-700">More Mobile Controls</h2>
          <p className="mt-1 text-sm text-slate-500">Add upcoming mobile app features here.</p>
        </div>
      </div>

      {/* ── Spin Wheel Campaign ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <GiftIcon size={18} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Spin Wheel Campaign</h2>
            <p className="mt-1 text-sm text-slate-600">
              Let customers spin a wheel to win promo codes. Winning codes are instantly usable at checkout.
            </p>
          </div>
          <label className="relative mt-1 inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={spinEnabled}
              onChange={(e) => setSpinEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="h-6 w-11 rounded-full bg-slate-300 peer peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
          </label>
        </div>

        {spinLoading ? (
          <div className="text-sm text-slate-500">Loading spin wheel settings...</div>
        ) : (
          <form onSubmit={handleSpinSave} className="space-y-5">
            {/* General settings */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  maxLength={80}
                  placeholder="Spin & Win"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Coupon Code Prefix</label>
                <input
                  type="text"
                  value={couponPrefix}
                  onChange={(e) =>
                    setCouponPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))
                  }
                  placeholder="SPIN"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Generated codes: {couponPrefix || 'SPIN'}-XXXXX
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Daily Spins Per User</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={dailySpinLimit}
                  onChange={(e) =>
                    setDailySpinLimit(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))
                  }
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                />
              </div>
              <div className="flex flex-col justify-end pb-1">
                <p className="text-xs text-slate-500">
                  Total weight:{' '}
                  <span className="font-semibold text-slate-800">{totalWeight}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Slices: <span className="font-semibold text-slate-800">{spinSlices.length}</span>
                </p>
              </div>
            </div>

            {/* Slices */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Wheel Slices</h3>
                <button
                  type="button"
                  onClick={addSpinSlice}
                  disabled={spinSlices.length >= 12}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                >
                  <PlusIcon size={13} /> Add Slice
                </button>
              </div>

              <div className="space-y-2">
                {spinSlices.map((slice, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    style={{ borderLeftWidth: 4, borderLeftColor: slice.color }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-600">Slice {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSpinSlice(idx)}
                        disabled={spinSlices.length <= 2}
                        className="text-rose-500 disabled:text-slate-300"
                      >
                        <Trash2Icon size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="mb-1 block text-xs text-slate-600">Label</label>
                        <input
                          type="text"
                          value={slice.label}
                          onChange={(e) => updateSpinSlice(idx, { label: e.target.value })}
                          placeholder="10% Off"
                          maxLength={50}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-slate-600">Reward Type</label>
                        <select
                          value={slice.rewardType}
                          onChange={(e) => updateSpinSlice(idx, { rewardType: e.target.value })}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                        >
                          <option value="no_win">No Win</option>
                          <option value="coupon_percent">% Off Coupon</option>
                          <option value="coupon_flat">Flat ₹ Coupon</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-slate-600">Weight</label>
                        <input
                          type="number"
                          min={0}
                          value={slice.weight}
                          onChange={(e) =>
                            updateSpinSlice(idx, { weight: Math.max(0, parseInt(e.target.value) || 0) })
                          }
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>

                      {slice.rewardType !== 'no_win' && (
                        <>
                          <div>
                            <label className="mb-1 block text-xs text-slate-600">
                              {slice.rewardType === 'coupon_percent' ? 'Discount %' : 'Discount ₹'}
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={slice.discountValue}
                              onChange={(e) =>
                                updateSpinSlice(idx, {
                                  discountValue: Math.max(0, parseFloat(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs text-slate-600">Min Order ₹</label>
                            <input
                              type="number"
                              min={0}
                              value={slice.minOrderValue}
                              onChange={(e) =>
                                updateSpinSlice(idx, {
                                  minOrderValue: Math.max(0, parseFloat(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs text-slate-600">Expiry (hrs)</label>
                            <input
                              type="number"
                              min={1}
                              value={slice.expiryHours}
                              onChange={(e) =>
                                updateSpinSlice(idx, {
                                  expiryHours: Math.max(1, parseInt(e.target.value) || 48),
                                })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="mb-1 block text-xs text-slate-600">Colour</label>
                        <input
                          type="color"
                          value={slice.color}
                          onChange={(e) => updateSpinSlice(idx, { color: e.target.value })}
                          className="h-8 w-full cursor-pointer rounded border border-slate-300 p-0.5"
                        />
                      </div>
                    </div>

                    {slice.rewardType !== 'no_win' && totalWeight > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Win probability: {((slice.weight / totalWeight) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {spinMessage && (
              <p
                className={`text-sm ${
                  spinMessage.includes('success') ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {spinMessage}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={spinSaving}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {spinSaving ? 'Saving…' : 'Save Spin Campaign'}
              </button>
              <p className="text-xs text-slate-500">
                {spinEnabled ? '✅ Campaign is LIVE' : '⏸ Campaign is paused'}
              </p>
            </div>
          </form>
        )}
      </div>

      {/* ── Mobile Banner Slider ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-2 text-slate-700">
              <ImageIcon size={18} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Mobile Banner Slider</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload and manage slider banners for your mobile app homepage.
            </p>
          </div>

          <label className="relative mt-1 inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="h-6 w-11 rounded-full bg-slate-300 peer peer-checked:bg-emerald-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
          </label>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Loading mobile banner settings...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {slides.map((slide, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium text-slate-900">Banner {idx + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeSlide(idx)}
                    disabled={slides.length <= 1}
                    className="text-sm text-rose-600 disabled:text-slate-400"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Banner Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => uploadSlideImage(idx, e.target.files?.[0])}
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Recommended ratio: 16:9, max {MAX_IMAGE_SIZE_MB}MB
                    </p>
                    {slide.image && (
                      <img
                        src={slide.image}
                        alt={`Mobile banner ${idx + 1}`}
                        className="mt-2 h-20 w-full rounded border border-slate-200 object-cover"
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Click Link</label>
                    <input
                      type="text"
                      value={slide.link}
                      onChange={(e) => updateSlide(idx, { link: e.target.value })}
                      placeholder="/offers"
                      className="w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Banner Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={slide.title}
                      onChange={(e) => updateSlide(idx, { title: e.target.value })}
                      placeholder="Summer Sale"
                      className="w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={addSlide}
                disabled={slides.length >= MAX_SLIDES}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                + Add Banner
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Banners'}
              </button>
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.includes('success') ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
