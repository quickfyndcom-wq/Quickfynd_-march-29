'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SignInModal from '@/components/SignInModal'
import { auth } from '@/lib/firebase'
import axios from 'axios'

export default function SignInClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [redirectTo, setRedirectTo] = useState('/')

  useEffect(() => {
    const target = searchParams.get('redirect_to') || '/'
    setRedirectTo(target)
  }, [searchParams])

  const linkGuestOrders = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    const email = String(currentUser.email || '').trim()
    const phone = String(currentUser.phoneNumber || '').trim()
    if (!email && !phone) return

    try {
      const token = await currentUser.getIdToken(true)
      await axios.post(
        '/api/user/link-guest-orders',
        { email, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch (err) {
      if (err?.response?.status === 401) {
        try {
          const refreshedToken = await currentUser.getIdToken(true)
          await axios.post(
            '/api/user/link-guest-orders',
            { email, phone },
            { headers: { Authorization: `Bearer ${refreshedToken}` } }
          )
        } catch (_) {
          // Non-blocking: orders API also has guest auto-link fallback.
        }
      }
    }
  }

  const handleClose = async () => {
    if (auth.currentUser) {
      await linkGuestOrders()
      router.push(redirectTo)
      return
    }

    router.push('/')
  }

  return <SignInModal open={true} onClose={handleClose} defaultMode="login" disableQuickSignIn={true} />
}
