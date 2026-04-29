'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { BellIcon, ImageIcon, Smartphone } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'

const MAX_SLIDES = 8
const MAX_IMAGE_SIZE_MB = 5

const emptySlide = () => ({
  image: '',
  link: '/offers',
  title: '',
})

export default function MobileFeaturesPage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [slides, setSlides] = useState([emptySlide()])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = await getToken()
        if (!token) {
          setLoading(false)
          return
        }

        const { data } = await axios.get('/api/store/mobile-banner-slider', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (typeof data?.enabled === 'boolean') {
          setEnabled(data.enabled)
        }

        if (Array.isArray(data?.slides) && data.slides.length > 0) {
          setSlides(
            data.slides.map((slide) => ({
              image: slide.image || '',
              link: slide.link || '/offers',
              title: slide.title || '',
            }))
          )
        }
      } catch (err) {
        console.error('Failed to load mobile banner slider settings', err)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [getToken])

  const updateSlide = (idx, patch) => {
    setSlides((prev) => prev.map((slide, i) => (i === idx ? { ...slide, ...patch } : slide)))
  }

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

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mobile Features</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage mobile application specific features from this dashboard section.
        </p>
      </div>

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

          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full" />
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
                    <p className="mt-1 text-xs text-slate-500">Recommended ratio: 16:9, max {MAX_IMAGE_SIZE_MB}MB</p>
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
                    <label className="mb-2 block text-sm font-medium text-slate-700">Banner Title (Optional)</label>
                    <input
                      type="text"
                      value={slide.title}
                      onChange={(e) => updateSlide(idx, { title: e.target.value })}
                      placeholder="Festival Sale"
                      className="w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={addSlide}
                disabled={slides.length >= MAX_SLIDES}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Add Banner
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Mobile Slider'}
              </button>

              {message && (
                <span className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-rose-600'}`}>
                  {message}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
