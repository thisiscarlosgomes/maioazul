"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Pause, Play, X } from "lucide-react";
import { pauseVoice, resumeVoice, stopVoice, useVoiceState } from "@/lib/voice";
import { useLang } from "@/lib/lang";

const navRoutes = ["/map", "/places", "/experiences", "/favorites"];

function shouldShowNav(pathname: string | null) {
  if (!pathname) return false;
  return navRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showNav = shouldShowNav(pathname);
  const [hideNav, setHideNav] = useState(false);
  const voiceState = useVoiceState();
  const showVoicePill = voiceState.status !== "idle";
  const voicePillBottom = showNav && !hideNav
    ? "calc(5.5rem + env(safe-area-inset-bottom))"
    : "calc(1rem + env(safe-area-inset-bottom))";
  const [lang] = useLang();

  const copy = useMemo(
    () => ({
      en: {
        nowPlaying: "Now playing",
        pause: "Pause",
        resume: "Resume",
        close: "Close",
      },
      pt: {
        nowPlaying: "A tocar",
        pause: "Pausar",
        resume: "Continuar",
        close: "Fechar",
      },
    }),
    []
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ hidden: boolean; hideHeader?: boolean }>).detail;
      setHideNav(Boolean(detail?.hidden));
      if (detail?.hideHeader) {
        document.body.classList.add("maio-hide-header");
      } else {
        document.body.classList.remove("maio-hide-header");
      }
    };
    window.addEventListener("maio-nav-visibility", handler as EventListener);
    return () => {
      window.removeEventListener("maio-nav-visibility", handler as EventListener);
      document.body.classList.remove("maio-hide-header");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (voiceState.status !== "paused") return;
    const raw = window.localStorage.getItem("maio-voice-autoresume");
    if (!raw) return;
    window.localStorage.removeItem("maio-voice-autoresume");
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return;
    if (Date.now() - ts < 8000) {
      resumeVoice();
    }
  }, [voiceState.status]);

  return (
    <>
      <div
        className={showNav ? "min-h-[100svh] pb-24" : "min-h-[100svh]"}
        style={
          showNav && !hideNav
            ? {
                paddingBottom: showVoicePill
                  ? "calc(11rem + env(safe-area-inset-bottom))"
                  : "calc(6.5rem + env(safe-area-inset-bottom))",
              }
            : showVoicePill
              ? { paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }
              : undefined
        }
      >
        {children}
      </div>
      {!hideNav && showVoicePill && (
        <div className="fixed inset-x-0 z-50" style={{ bottom: voicePillBottom }}>
          <div className="mx-auto max-w-3xl px-10">
            <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
              {voiceState.placeId ? (
                <Link
                  href={`/places/${voiceState.placeId}`}
                  aria-label={voiceState.title || "Voice guide"}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {copy[lang].nowPlaying}
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">
                    {voiceState.title || "Voice guide"}
                  </div>
                </Link>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {copy[lang].nowPlaying}
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">
                    {voiceState.title || "Voice guide"}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                {voiceState.status === "loading" ? (
                  <div className="text-xs text-muted-foreground">
                    {lang === "pt" ? "A preparar áudio..." : "Preparing audio..."}
                  </div>
                ) : voiceState.status === "paused" ? (
                  <button
                    type="button"
                    onClick={resumeVoice}
                    aria-label={copy[lang].resume}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm hover:bg-accent"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseVoice}
                    aria-label={copy[lang].pause}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm hover:bg-accent"
                  >
                    <Pause className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={stopVoice}
                  aria-label={copy[lang].close}
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background/95 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-sm hover:bg-accent"
                >
                  {copy[lang].close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showNav && !hideNav && <BottomNav />}
    </>
  );
}
