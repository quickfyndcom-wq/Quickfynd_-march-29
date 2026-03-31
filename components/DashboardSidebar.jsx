'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardSidebar() {
  const pathname = usePathname()
  const mobileSliderRef = useRef(null)
  const [currentHash, setCurrentHash] = useState('')

  const menuItems = [
    { label: 'Profile', href: '/dashboard/profile' },
    { label: 'Orders', href: '/dashboard/orders' },
    { label: 'Wishlist', href: '/dashboard/wishlist' },
    { label: 'Browse History', href: '/browse-history' },
    { label: 'Support Tickets', href: '/dashboard/tickets' },
    { label: 'Account Settings', href: '/settings' },
    { label: 'Privacy', href: '/settings/privacy', tag: 'NEW' },
    { label: 'Help & Support', href: '/help' },
  ]

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateHash = () => {
      setCurrentHash(window.location.hash || '')
    }

    updateHash()
    window.addEventListener('hashchange', updateHash)

    return () => {
      window.removeEventListener('hashchange', updateHash)
    }
  }, [])

  const isActive = (href) => {
    if (href.includes('#')) {
      const [basePath, hashPart] = href.split('#')
      return pathname === basePath && currentHash === `#${hashPart}`
    }

    if (pathname !== href) return false

    const hasHashSpecificMenuForCurrentRoute = !!currentHash && menuItems.some(
      (item) => item.href === `${href}${currentHash}`
    )

    return !hasHashSpecificMenuForCurrentRoute
  }

  const handleSliderArrowClick = () => {
    if (!mobileSliderRef.current) return
    mobileSliderRef.current.scrollBy({ left: 180, behavior: 'smooth' })
  }

  return (
    <>
      {/* Mobile navigation slider */}
      <div className="md:hidden -mt-2 mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
          <button
            type="button"
            onClick={handleSliderArrowClick}
            className="w-7 h-7 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center bg-white"
            aria-label="Scroll dashboard menu"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div ref={mobileSliderRef} className="overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1">
          <div className="flex gap-2 min-w-max">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`snap-start min-w-[140px] px-3 py-3 rounded-xl border text-sm font-medium transition flex items-center justify-between gap-2 ${
                  isActive(item.href)
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{item.label}</span>
                  {item.tag && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      {item.tag}
                    </span>
                  )}
                </span>
                {isActive(item.href) && (
                  <span className="w-5 h-5 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:block md:col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm p-4 h-fit md:sticky md:top-24 max-h-[calc(100vh-7rem)] overflow-hidden">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Dashboard</h2>
        <nav className="flex flex-col gap-1 text-sm overflow-y-auto pr-1 max-h-[calc(100vh-12rem)]">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg hover:bg-gray-100 font-medium flex items-center justify-between gap-2 ${
                isActive(item.href)
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-700'
              }`}
            >
              <span>{item.label}</span>
              {item.tag && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                  {item.tag}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-4 text-xs text-slate-500">
          Manage your account and preferences.
        </div>
      </aside>
    </>
  )
}
