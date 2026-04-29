"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const gtmId = "GTM-5QLZ2255";
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!pixelId) return null;

  const getAdvancedMatching = (user) => {
    let advancedMatching = {};

    try {
      const email = String(user?.email || "").trim().toLowerCase();
      const phone = String(user?.phoneNumber || "").replace(/\D/g, "");

      if (email) {
        advancedMatching = { ...advancedMatching, em: email };
      }

      if (phone) {
        advancedMatching = { ...advancedMatching, ph: phone };
      }

      let externalId = window.localStorage.getItem("meta_external_id") || "";
      if (!externalId) {
        externalId = `${window.location.hostname}_${Date.now()}`;
        window.localStorage.setItem("meta_external_id", externalId);
      }
      if (externalId) {
        advancedMatching = { ...advancedMatching, external_id: externalId };
      }
    } catch {}

    return advancedMatching;
  };

  const isPixelAlreadyInitialized = () => {
    try {
      if (!window.fbq || typeof window.fbq.getState !== "function") return false;
      const state = window.fbq.getState();
      const pixels = Array.isArray(state?.pixels) ? state.pixels : [];
      return pixels.some((p) => String(p?.id || "") === String(pixelId));
    } catch {
      return false;
    }
  };

  const isGtmPresent = () => {
    try {
      if (window.google_tag_manager && window.google_tag_manager[gtmId]) return true;
      const scripts = Array.from(document.getElementsByTagName("script"));
      return scripts.some((s) => String(s.src || "").includes(`gtm.js?id=${gtmId}`));
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Single-owner strategy: if GTM is present, it should own Meta Pixel init.
    // This prevents duplicate pixel initialization from app code + GTM tag.
    if (isGtmPresent()) {
      return;
    }

    !(function(f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    if (!window.__metaPixelInitialized && !isPixelAlreadyInitialized()) {
      const advancedMatching = getAdvancedMatching(auth?.currentUser);
      window.fbq && window.fbq("init", pixelId, advancedMatching);
      window.__metaPixelInitialized = true;
    } else if (isPixelAlreadyInitialized()) {
      window.__metaPixelInitialized = true;
    }
  }, [pixelId]);

  useEffect(() => {
    if (typeof window === "undefined" || !pixelId) return;

    const unsub = onAuthStateChanged(auth, (user) => {
      // Keep auth listener for future extension, but never re-init fbq.
      // Re-initializing the same pixel ID can duplicate subscriptions.
      if (!window.fbq || !user) return;
    });

    return () => unsub();
  }, [pixelId]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.fbq) return;

    const query = searchParams?.toString() || "";
    const routeKey = query ? `${pathname || ""}?${query}` : `${pathname || ""}`;
    if (window.__lastMetaPageView === routeKey) return;

    window.fbq("track", "PageView");
    window.__lastMetaPageView = routeKey;
  }, [pathname, searchParams]);

    return (
      <>
        {/* Meta Pixel noscript fallback */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
            alt="Meta Pixel"
          />
        </noscript>
      </>
    );
}
