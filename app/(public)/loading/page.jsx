'use client'

import Loading from "@/components/Loading"
import { clearCart, fetchCart } from "@/lib/features/cart/cartSlice"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { useDispatch } from "react-redux"
import { useAuth } from "@/lib/useAuth"


export default function LoadingPage() {
    const router = useRouter()
    const dispatch = useDispatch()
    const { getToken } = useAuth()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const url = params.get('nextUrl')

        if (url) {
            // Clear cart immediately and fetch updated cart from server
            dispatch(clearCart())
            dispatch(fetchCart({ getToken }))
            
            setTimeout(() => {
                router.push(url)
            }, 8000)
        }
    }, [router, dispatch, getToken])

    return <Loading />
}
