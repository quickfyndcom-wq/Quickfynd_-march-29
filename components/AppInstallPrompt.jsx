'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import AppLogo from '@/assets/logo/applogo.png';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.quickfynd';

export default function AppInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const decideVisibility = async () => {
      const dismissed = sessionStorage.getItem('appPromptDismissed');
      if (dismissed) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const ua = navigator.userAgent || navigator.vendor || '';
      const isIOS = /iPad|iPhone|iPod/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      // iOS app is not available yet, so hide the banner entirely.
      if (isIOS) {
        if (!cancelled) {
          setIsVisible(false);
          setIsLoading(false);
        }
        return;
      }

      const isAndroid = /Android/i.test(ua);
      const isMobileUA = /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isMobileViewport = window.innerWidth < 768;
      const isMobile = isMobileUA || isMobileViewport;

      if (!isMobile || !isAndroid) {
        if (!cancelled) {
          setIsVisible(false);
          setIsLoading(false);
        }
        return;
      }

      const isStandalone =
        window.matchMedia?.('(display-mode: standalone)')?.matches ||
        window.navigator.standalone === true;

      let hasInstalledRelatedApp = false;
      if (typeof navigator.getInstalledRelatedApps === 'function') {
        try {
          const relatedApps = await navigator.getInstalledRelatedApps();
          hasInstalledRelatedApp = relatedApps.some((app) => {
            const id = String(app?.id || '').toLowerCase();
            return id.includes('com.quickfynd');
          });
        } catch {
          hasInstalledRelatedApp = false;
        }
      }

      if (!cancelled) {
        setIsVisible(!(isStandalone || hasInstalledRelatedApp));
        setIsLoading(false);
      }
    };

    decideVisibility();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = () => {
    window.open(PLAY_STORE_URL, '_blank');
    handleDismiss();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('appPromptDismissed', 'true');
  };

  if (isLoading || !isVisible) return null;

  return (
    <div className="w-full bg-white border-b border-gray-200 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Left: Colored Sidebar with Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* Vibrant Pink Icon Box with Logo */}
          <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
            <Image
              src={AppLogo}
              alt="Quickfynd"
              width={56}
              height={56}
              className="w-full h-full object-cover rounded-2xl"
              priority
              unoptimized
            />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
              Quickfynd is better on the app
            </p>
            <p className="text-xs sm:text-sm text-gray-600 leading-tight">
              Get app-exclusive deals and faster checkout
            </p>
          </div>
        </div>

        {/* Right: CTA Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownload}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm transition-all hover:shadow-md whitespace-nowrap"
          >
            Download
          </button>
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
