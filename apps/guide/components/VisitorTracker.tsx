"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_ID_KEY = "maio_visitor_id";

function getVisitorId() {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(VISITOR_ID_KEY, created);
  return created;
}

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const visitorId = getVisitorId();
    if (!visitorId || !pathname) return;

    const payload = JSON.stringify({
      visitorId,
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      ts: new Date().toISOString(),
    });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
      return;
    }

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // No-op: tracking should never break user flow.
    });
  }, [pathname]);

  return null;
}
