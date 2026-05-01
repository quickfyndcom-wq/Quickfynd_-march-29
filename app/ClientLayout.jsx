"use client";
import ReduxProvider from "@/lib/ReduxProvider";
import Navbar from "@/components/Navbar";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import DesktopAppDownloadBar from "@/components/DesktopAppDownloadBar";
import Footer from "@/components/Footer";
import SupportBar from "@/components/SupportBar";
import Chatbot from "@/components/Chatbot";
import PageTracker from "@/components/PageTracker";
import { toast, Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.quickfynd";
const APP_RELEASE_TOAST_KEY = "quickfynd-play-store-release-toast-shown";
const APP_RELEASE_TOAST_ID = "quickfynd-play-store-release";

function InitializeApp({ children }) {
  const dispatch = useDispatch();
  const products = useSelector((state) => state.product.list);

  useEffect(() => {
    // Load products on app start if we have less than 100 products
    if (products.length < 100) {
      const loadProducts = async () => {
        try {
          // Fetch ALL products with a very high limit
          const { data } = await axios.get("/api/products?limit=200");
          if (data.products && Array.isArray(data.products)) {
            dispatch({ type: "product/setProduct", payload: data.products });
            console.log('[ClientLayout] Loaded', data.products.length, 'products');
          } else if (data && Array.isArray(data)) {
            dispatch({ type: "product/setProduct", payload: data });
            console.log('[ClientLayout] Loaded', data.length, 'products');
          }
        } catch (error) {
          const serverDetails = error?.response?.data;
          if (serverDetails) {
            console.error('[ClientLayout] Failed to load products:', serverDetails);
          } else {
            console.error('[ClientLayout] Failed to load products:', error);
          }
        }
      };
      loadProducts();
    }
  }, [products.length, dispatch]);

  return children;
}

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const [appDownloadPromotionEnabled, setAppDownloadPromotionEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAppDownloadPromotionSettings = async () => {
      try {
        const response = await fetch('/api/store/app-download-promotion');
        if (!response.ok) return;

        const data = await response.json();
        if (!cancelled) {
          setAppDownloadPromotionEnabled(data?.enabled !== false);
        }
      } catch {
        if (!cancelled) {
          setAppDownloadPromotionEnabled(true);
        }
      }
    };

    loadAppDownloadPromotionSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const isInternalRoute =
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/store") ||
      pathname?.startsWith("/dashboard");

    if (isInternalRoute || !appDownloadPromotionEnabled) {
      return;
    }

    try {
      if (window.localStorage.getItem(APP_RELEASE_TOAST_KEY) === "1") {
        return;
      }

      window.localStorage.setItem(APP_RELEASE_TOAST_KEY, "1");
    } catch {
      return;
    }

    toast.custom(
      (toastInstance) => (
        <div className="pointer-events-auto w-[min(92vw,360px)] rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold text-slate-900">
            Quickfynd app is now live on Play Store
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Download the app for app-only discounts and a faster checkout experience.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
                toast.dismiss(APP_RELEASE_TOAST_ID);
              }}
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Download App
            </button>
            <button
              type="button"
              onClick={() => toast.dismiss(APP_RELEASE_TOAST_ID)}
              className="text-xs font-medium text-slate-500"
            >
              Maybe later
            </button>
          </div>
        </div>
      ),
      {
        id: APP_RELEASE_TOAST_ID,
        duration: 8000,
        position: "bottom-right",
      }
    );
  }, [appDownloadPromotionEnabled, pathname]);

  return (
    <ReduxProvider>
      <AppInstallPrompt />
      <DesktopAppDownloadBar enabled={appDownloadPromotionEnabled} />
      <Navbar />
      <PageTracker />
      <Toaster />
      <InitializeApp>{children}</InitializeApp>
      <SupportBar />
      <Chatbot />
      <Footer />
    </ReduxProvider>
  );
}
