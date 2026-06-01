'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, updateProfile } from 'firebase/auth'
import Loading from '@/components/Loading'
import Link from 'next/link'
import toast from 'react-hot-toast'


export default function ProfilePage() {
  const [user, setUser] = useState(undefined) // undefined: loading, null: not logged in
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'orders' | 'wishlist' | 'history'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return () => unsub()
  }, [])

  if (user === undefined) return <Loading />

  // Redirect /profile to /dashboard/profile
  return (
    <>
      {/* <Navbar /> removed, now global via ClientLayout */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-800 mb-3">Profile has moved</h1>
        <p className="text-slate-600 mb-6">Your profile is now under Dashboard.</p>
        <Link href="/dashboard/profile" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Dashboard · Profile</Link>
      </div>
      {/* <Footer /> removed, now global via ClientLayout */}
    </>
  )

  // Legacy page kept as redirect notice
}
