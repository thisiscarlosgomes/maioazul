"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { Pause, Play } from "lucide-react";
import { pauseVoice, resumeVoice, stopVoice, useVoiceState } from "@/lib/voice";
import { useLang } from "@/lib/lang";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const navRoutes = ["/map", "/places", "/experiences", "/favorites"];
const PORTAL_INTRO_STORAGE_KEY = "maio-portal-intro-seen-v1";

function shouldShowNav(pathname: string | null) {
  if (!pathname) return false;
  return navRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showNav = shouldShowNav(pathname);
  const showAppHeader = Boolean(pathname && pathname !== "/" && pathname !== "/partners");
  const [showPortalIntro, setShowPortalIntro] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
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
      setHideHeader(Boolean(detail?.hideHeader));
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
    if (!pathname || pathname === "/") return;
    const hasSeenIntro = window.localStorage.getItem(PORTAL_INTRO_STORAGE_KEY) === "1";
    if (!hasSeenIntro) {
      queueMicrotask(() => {
        setShowPortalIntro(true);
      });
    }
  }, [pathname]);

  useEffect(() => {
    const handleOpenPortalIntro = () => setShowPortalIntro(true);
    window.addEventListener("maio-open-portal-intro", handleOpenPortalIntro);
    return () => {
      window.removeEventListener("maio-open-portal-intro", handleOpenPortalIntro);
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

  const dismissPortalIntro = () => {
    setShowPortalIntro(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PORTAL_INTRO_STORAGE_KEY, "1");
    }
  };
  const contentStyle = {
    ...(showNav && !hideNav
      ? {
          paddingBottom: showVoicePill
            ? "calc(11rem + env(safe-area-inset-bottom))"
            : "calc(6.5rem + env(safe-area-inset-bottom))",
        }
      : showVoicePill
        ? { paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }
        : {}),
    ...(showAppHeader && !hideHeader ? { paddingTop: "3.5rem" } : {}),
  };

  return (
    <>
      {showAppHeader && <AppHeader />}
      <div
        className={showNav ? "min-h-[100svh] pb-24" : "min-h-[100svh]"}
        style={contentStyle}
      >
        {children}
      </div>
      <Dialog
        open={showPortalIntro}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setShowPortalIntro(true);
            return;
          }
          dismissPortalIntro();
        }}
      >
        <DialogContent
          aria-label="Sobre o Portal de Dados"
          className="z-[90] w-[calc(100vw-1.5rem)] max-w-xl gap-0 rounded-2xl border-border bg-background p-0 text-left sm:rounded-3xl"
          overlayClassName="z-[89] bg-black/45 backdrop-blur-sm"
          showClose={false}
        >
          <div className="p-5 sm:p-6">
            <DialogTitle className="text-lg font-semibold leading-tight sm:text-xl">
              O que é o Portal de Dados do Maio?
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Pela primeira vez, informação pública sobre a Ilha do Maio está organizada num só lugar.
              O portal reúne indicadores, orçamento municipal, documentos públicos e dados territoriais.
              Com apoio de inteligência artificial, qualquer cidadão pode explorar os dados, acompanhar
              tendências e compreender melhor o desenvolvimento da ilha.
            </DialogDescription>
            <div className="mt-5">
              <button
                type="button"
                onClick={dismissPortalIntro}
                className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-muted p-2 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Fechar
              </button>
            </div>
            <div className="mt-3 text-xs opacity-50">Um projeto publico da maioazul.com</div>
          </div>
        </DialogContent>
      </Dialog>
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
