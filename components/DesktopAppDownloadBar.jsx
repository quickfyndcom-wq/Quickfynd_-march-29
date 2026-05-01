'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import AppLogo from '@/assets/logo/applogo.png';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.quickfynd';
const DISPLAY_DURATION_MS = 10000;

export default function DesktopAppDownloadBar({ enabled = true }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isInternalRoute =
      pathname?.startsWith('/admin') ||
      pathname?.startsWith('/store') ||
      pathname?.startsWith('/dashboard');

    if (isInternalRoute) {
      setVisible(false);
      return undefined;
    }

    if (!enabled) {
      setVisible(false);
      return undefined;
    }

    if (typeof window === 'undefined' || window.innerWidth < 1024) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);

    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, DISPLAY_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enabled, pathname]);

  if (!visible) return null;

  return (
    <div className="hidden lg:block border-b border-rose-950 bg-[linear-gradient(90deg,#2a0f16_0%,#4a1320_34%,#6b1d2c_68%,#2a0f16_100%)] text-white">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-2 text-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white/10 shadow-sm">
            <Image
              src={AppLogo}
              alt="Quickfynd App"
              width={36}
              height={36}
              className="h-full w-full object-cover"
              priority={false}
            />
          </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-rose-50">
                Quickfynd app is now on Play Store. Get extra app-only discounts and faster checkout.
              </p>
          </div>
        </div>

          <div className="flex shrink-0 items-center gap-2.5">
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
              className="rounded-md bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(6,95,70,0.35)]"
          >
            Download App
          </a>
          <button
            type="button"
            onClick={() => setVisible(false)}
              className="rounded-md border border-white/15 bg-white/10 p-1.5 text-slate-300"
            aria-label="Dismiss desktop app download bar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}