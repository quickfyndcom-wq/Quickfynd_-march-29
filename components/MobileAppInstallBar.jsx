'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import AppLogo from '@/assets/logo/applogo.png';

const DISMISS_KEY = 'mobileAppInstallBarDismissedAt';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

export default function MobileAppInstallBar() {
  const [visible, setVisible] = useState(false);

  const playStoreUrl = useMemo(
    () => 'https://play.google.com/store/apps/details?id=com.quickfynd',
    []
  );

  useEffect(() => {
    try {
      const ua = navigator.userAgent || navigator.vendor || '';
      const isIOS = /iPad|iPhone|iPod/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (isIOS) {
        setVisible(false);
        return;
      }

      const dismissedAtRaw = localStorage.getItem(DISMISS_KEY);
      if (!dismissedAtRaw) {
        setVisible(true);
        return;
      }

      const dismissedAt = Number(dismissedAtRaw);
      if (!Number.isFinite(dismissedAt) || Date.now() - dismissedAt >= DISMISS_TTL_MS) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore storage failures and just close for this session.
    }
  };

  if (!visible) return null;

  return (
    <div className="md:hidden bg-white text-slate-900 relative z-[60] border-b border-slate-200 shadow-sm">
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={AppLogo}
            alt="Quickfynd App"
            width={36}
            height={36}
            className="h-full w-full object-cover"
            priority={false}
          />
        </div>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[12px] font-semibold truncate">Quickfynd Shopping App</p>
          <p className="text-[11px] text-slate-600 truncate">Download app and get 10% more discount</p>
        </div>

        <a
          href={playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
          aria-label="Download Quickfynd app on Play Store"
        >
          Install
        </a>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-full text-slate-500"
          aria-label="Dismiss app install bar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
