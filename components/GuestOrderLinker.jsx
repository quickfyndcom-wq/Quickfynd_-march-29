'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'

export default function GuestOrderLinker() {
    const { user, loading, getToken } = useAuth()
    const isSignedIn = !!user
    const [checked, setChecked] = useState(false)

    useEffect(() => {
        const linkGuestOrders = async () => {
            // Skip if still loading, not signed in, or already checked
            if (loading || !isSignedIn || checked) return

            try {
                const token = await getToken(true)
                if (!token) return

                const email = user?.email
                const phone = user?.phoneNumber

                if (!email && !phone) return

                let data

                try {
                    const response = await axios.post('/api/user/link-guest-orders', {
                        email,
                        phone
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    data = response.data
                } catch (err) {
                    // Token may be stale right after sign-in; retry once with forced refresh
                    if (err?.response?.status === 401) {
                        const refreshedToken = await getToken(true)
                        if (!refreshedToken) {
                            setChecked(true)
                            return
                        }

                        const retryResponse = await axios.post('/api/user/link-guest-orders', {
                            email,
                            phone
                        }, {
                            headers: { Authorization: `Bearer ${refreshedToken}` }
                        })
                        data = retryResponse.data
                    } else {
                        throw err
                    }
                }

                if (data.linked && data.count > 0) {
                    toast.success(`Welcome back! We've linked ${data.count} previous order(s) to your account.`, {
                        duration: 5000
                    })
                }

                setChecked(true)
            } catch (error) {
                // Silently fail - this is a background operation
                if (error?.response?.status !== 401) {
                    console.error('Failed to link guest orders:', error)
                }
                setChecked(true)
            }
        }

        // Run after a short delay to avoid blocking initial page load
        const timer = setTimeout(linkGuestOrders, 1500)
        return () => clearTimeout(timer)
    }, [isSignedIn, user, getToken, loading, checked])

    return null // This component doesn't render anything
}
