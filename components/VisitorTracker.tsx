"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_ID_KEY = "maioazul_visitor_id";

function getOrCreateVisitorId(): string {
  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const nextId = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_ID_KEY, nextId);
  return nextId;
}

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api")) return;

    try {
      const day = new Date().toISOString().slice(0, 10);
      const dedupeKey = `maioazul_visit_sent:${day}:${pathname}`;
      if (window.sessionStorage.getItem(dedupeKey)) return;
      window.sessionStorage.setItem(dedupeKey, "1");

      const visitorId = getOrCreateVisitorId();
      void fetch("/api/visitors/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, path: pathname }),
        keepalive: true,
      });
    } catch {
      // Analytics tracking should never break navigation/render.
    }
  }, [pathname]);

  return null;
}

