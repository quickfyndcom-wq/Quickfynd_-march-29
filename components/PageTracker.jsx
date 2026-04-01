"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getTrackedStoreId, setTrackedStoreId, trackCustomerBehaviorEvent } from "@/lib/customerBehaviorTracking";

function shouldTrackPath(pathname) {
  const path = String(pathname || "").toLowerCase();
  if (!path) return false;
  if (path.startsWith("/api")) return false;
  if (path.startsWith("/store")) return false;
  if (path.startsWith("/dashboard")) return false;
  return true;
}

function getStoreIdFromSearch() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search || "");
  return String(params.get("storeId") || params.get("sid") || "").trim();
}

export default function PageTracker() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef("");

  useEffect(() => {
    if (!shouldTrackPath(pathname)) return;

    const queryStoreId = getStoreIdFromSearch();
    const storeId = String(queryStoreId || getTrackedStoreId() || "").trim();
    if (!storeId) return;

    if (queryStoreId) {
      setTrackedStoreId(queryStoreId);
    }

    const key = `${storeId}:${pathname}`;
    if (lastTrackedPathRef.current === key) return;
    lastTrackedPathRef.current = key;

    trackCustomerBehaviorEvent({
      storeId,
      eventType: "page_view",
      nextAction: "viewing",
    });
  }, [pathname]);

  return null;
}
