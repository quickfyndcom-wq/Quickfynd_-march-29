'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ShopCatchAll() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to all products page
        router.replace('/products')
    }, [router])

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <p className="text-slate-500">Redirecting to products...</p>
        </div>
    )
}
