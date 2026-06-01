'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Loading from '@/components/Loading'
import DashboardSidebar from '@/components/DashboardSidebar'

const preferenceItems = [
  {
    key: 'profileVisibility',
    title: 'Profile Visibility',
    description: 'Allow your profile details to appear in personalized account experiences.'
  },
  {
    key: 'personalizedOffers',
    title: 'Personalized Offers',
    description: 'Use your activity to tailor deals and recommendations for you.'
  },
  {
    key: 'analyticsTracking',
    title: 'Analytics Tracking',
    description: 'Allow usage analytics to improve performance and user experience.'
  },
  {
    key: 'thirdPartySharing',
    title: 'Third-Party Sharing',
    description: 'Allow sharing limited account signals with trusted partners for features.'
  }
]

export default function PrivacySettingsPage() {
  const [user, setUser] = useState(undefined)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [privacyPreferences, setPrivacyPreferences] = useState({
    profileVisibility: true,
    personalizedOffers: true,
    analyticsTracking: true,
    thirdPartySharing: false
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return () => unsub()
  }, [])

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.email) return

      try {
        const response = await fetch(`/api/privacy-settings?email=${encodeURIComponent(user.email)}`)
        const data = await response.json()

        if (response.ok && data?.preferences) {
          setPrivacyPreferences(data.preferences)
        }
      } catch (error) {
        console.error('Error loading privacy preferences:', error)
      }
    }

    loadPreferences()
  }, [user])

  const handleToggle = async (type, value) => {
    if (!user?.email) return

    try {
      setLoading(true)
      setMessage(null)

      const response = await fetch('/api/privacy-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          type,
          value
        })
      })

      const data = await response.json()

      if (response.ok) {
        setPrivacyPreferences((prev) => ({
          ...prev,
          [type]: value
        }))
        setMessage({ type: 'success', text: 'Privacy settings updated successfully.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update privacy settings.' })
      }
    } catch (error) {
      console.error('Error updating privacy preference:', error)
      setMessage({ type: 'error', text: 'An error occurred while updating your settings.' })
    } finally {
      setLoading(false)
    }
  }

  if (user === undefined) return <Loading />

  if (user === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-800 mb-3">Privacy Settings</h1>
        <p className="text-slate-600 mb-6">Please sign in to manage your privacy preferences.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-6">
      <DashboardSidebar />

      <main className="md:col-span-3 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-semibold text-slate-800">Privacy Settings</h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">Customer Privacy</span>
          </div>
          <p className="text-slate-600 text-sm">Manage how your data is used for personalization, analytics, and sharing.</p>
        </div>

        {message && (
          <div className={`border rounded-lg p-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="space-y-3">
            {preferenceItems.map((item) => (
              <label key={item.key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={!!privacyPreferences[item.key]}
                  onChange={(e) => handleToggle(item.key, e.target.checked)}
                  disabled={loading}
                />
                <div className="flex-1">
                  <span className="text-slate-700 font-medium">{item.title}</span>
                  <p className="text-sm text-slate-500">{item.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Policy & Rights</h2>
          <p className="text-sm text-slate-600 mb-4">Read how data is handled and contact support for account data requests.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/privacy-policy" className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
              View Privacy Policy
            </Link>
            <Link href="/help" className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700">
              Contact Support
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
