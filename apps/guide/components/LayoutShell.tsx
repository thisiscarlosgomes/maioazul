"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Pause, Play, X } from "lucide-react";
import { pauseVoice, resumeVoice, stopVoice, useVoiceState } from "@/lib/voice";
import { useLang } from "@/lib/lang";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer } from "vaul";
import { useRef } from "react";

const navRoutes = ["/map", "/places", "/experiences", "/favorites"];

function shouldShowNav(pathname: string | null) {
  if (!pathname) return false;
  return navRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const allowIntroDrawer = pathname !== "/";
  const showNav = shouldShowNav(pathname);
  const [hideNav, setHideNav] = useState(false);
  const voiceState = useVoiceState();
  const showVoicePill = voiceState.status !== "idle";
  const voicePillBottom = showNav && !hideNav
    ? "calc(5.5rem + env(safe-area-inset-bottom))"
    : "calc(1rem + env(safe-area-inset-bottom))";
  const [lang] = useLang();
  const [introOpen, setIntroOpen] = useState(false);
  const [introPlayed, setIntroPlayed] = useState(false);
  const [introPlaying, setIntroPlaying] = useState(false);
  const [introLoading, setIntroLoading] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [introTimeLeft, setIntroTimeLeft] = useState<number | null>(null);
  const [introDuration, setIntroDuration] = useState<number | null>(null);
  const [guideLauncherHidden, setGuideLauncherHidden] = useState(false);
  const [introSkipEnabled, setIntroSkipEnabled] = useState(false);
  const introStartMsRef = useRef<number | null>(null);
  const introElapsedRef = useRef<number>(0);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const INTRO_KEY = "maio-intro-heard";
  const GUIDE_LAUNCHER_KEY = "maio-guide-launcher-hidden";

  const markIntroCompleted = useCallback(() => {
    setIntroPlayed(true);
    setIntroPlaying(false);
    setIntroTimeLeft(0);
    introStartMsRef.current = null;
    window.localStorage.setItem(INTRO_KEY, "1");
  }, []);

  const copy = useMemo(
    () => ({
      en: {
        nowPlaying: "Now playing",
        pause: "Pause",
        resume: "Resume",
        close: "Close",
        introTitle: "Experience Maio",
        introBody:
          "A calm, local-first guide to Maio Island: beaches, protected areas, and everyday life, curated with care. Move slowly, notice the small details, and feel the rhythm of the island as you explore. Let each stop be unhurried, each walk a quiet discovery, and each moment a chance to see how nature and community meet.",
        introPlay: "Play intro",
        introContinue: "Continue",
        introNext: "Next",
        introClose: "Close",
        introListening: "Listening...",
        mustKnowsTitle: "Must Knows",
        mustKnowsBody:
          "Small notes to help you move with the island’s rhythm.",
        mustKnowsItems: [
          "The wind changes fast. Mornings are often calmer.",
          "Protected areas are sacred, stay on paths and leave no trace.",
          "Water is precious. Carry what you need and refill where you can.",
          "Leave it lighter. Take every wrapper back with you.",
        ],
        exploreTitle: "Explore Maio",
        exploreBody:
          "Open the map, follow the coast, and meet the people who keep this rhythm alive.",
        exploreItems: [
          "Tap a place to read its story.",
          "Use voice guide for hands-free listening.",
          "Pin places to return later.",
          "Connect with locals — feel the morabeza.",
        ],
      },
      pt: {
        nowPlaying: "A tocar",
        pause: "Pausar",
        resume: "Continuar",
        close: "Fechar",
        introTitle: "Experience Maio",
        introBody:
          "Um guia calmo e local da ilha do Maio: praias, áreas protegidas e vida quotidiana, com curadoria cuidada. Explore com calma, repare nos detalhes e sinta o ritmo da ilha. Que cada paragem seja sem pressa, cada caminhada uma descoberta tranquila, e cada momento uma forma de ver como a natureza e a comunidade se encontram.",
        introPlay: "Reproduzir intro",
        introContinue: "Continuar",
        introNext: "Seguinte",
        introClose: "Fechar",
        introListening: "A ouvir...",
        mustKnowsTitle: "Essenciais",
        mustKnowsBody:
          "Pequenas notas para caminhar ao ritmo da ilha.",
        mustKnowsItems: [
          "O vento muda depressa. As manhãs são mais calmas.",
          "Áreas protegidas são sagradas — siga os trilhos e não deixe marcas.",
          "A água é preciosa. Leve o que precisa e reabasteça quando possível.",
          "Deixe mais leve. Leve sempre o lixo consigo.",
        ],
        exploreTitle: "Explorar Maio",
        exploreBody:
          "Abra o mapa, siga a costa e encontre quem mantém este ritmo vivo.",
        exploreItems: [
          "Toque num lugar para ler a história.",
          "Use o guia de voz para ouvir sem mãos.",
          "Fixe lugares para voltar depois.",
          "Conecte-se com os locais — sinta a morabeza.",
        ],
      },
    }),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!allowIntroDrawer) return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const already = window.localStorage.getItem(INTRO_KEY);
    const hidden = window.localStorage.getItem(GUIDE_LAUNCHER_KEY) === "1";
    setGuideLauncherHidden(hidden);
    if (!already && !hidden) {
      setIntroOpen(true);
    }
  }, [allowIntroDrawer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      setGuideLauncherHidden(false);
      window.localStorage.removeItem(GUIDE_LAUNCHER_KEY);
      setIntroStep(0);
      setIntroOpen(true);
    };
    window.addEventListener("maio-guide-open", handler as EventListener);
    return () => window.removeEventListener("maio-guide-open", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!introVideoRef.current) return;
    const video = introVideoRef.current;
    const onEnded = () => {
      markIntroCompleted();
    };
    const onPlay = () => {
      setIntroPlaying(true);
      setIntroLoading(false);
    };
    const onWaiting = () => setIntroLoading(true);
    const onCanPlay = () => setIntroLoading(false);
    const onLoaded = () => {
      if (!Number.isFinite(video.duration)) return;
      const duration = Math.ceil(video.duration);
      setIntroDuration(duration);
      if (!introStarted) {
        setIntroTimeLeft(duration);
      }
    };
    const onPause = () => {
      setIntroPlaying(false);
      if (introStartMsRef.current) {
        introElapsedRef.current += (Date.now() - introStartMsRef.current) / 1000;
        introStartMsRef.current = null;
      }
    };
    video.addEventListener("ended", onEnded);
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadedmetadata", onLoaded);
    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [introStarted, markIntroCompleted]);

  useEffect(() => {
    if (!introOpen) return;
    const video = introVideoRef.current;
    if (!video) return;
    introElapsedRef.current = 0;
    introStartMsRef.current = null;
    setIntroStep(0);
    setIntroPlayed(false);
    setIntroDuration(null);
    setIntroTimeLeft(null);
    setIntroStarted(false);
    setIntroPlaying(false);
    setIntroLoading(false);
    setIntroSkipEnabled(false);
    video.pause();
    video.currentTime = 0;
    video.load();
  }, [introOpen]);

  useEffect(() => {
    if (!introStarted) {
      setIntroSkipEnabled(false);
      return;
    }
    const id = window.setTimeout(() => {
      setIntroSkipEnabled(true);
    }, 5_000);
    return () => window.clearTimeout(id);
  }, [introStarted]);

  useEffect(() => {
    if (!introStarted) return;
    const video = introVideoRef.current;
    if (!video) return;
    const tick = () => {
      if (!Number.isFinite(video.duration)) return;
      const left = Math.max(0, Math.ceil(video.duration - video.currentTime));
      setIntroTimeLeft(left);
      if (left <= 0) {
        markIntroCompleted();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [introStarted, markIntroCompleted]);

  const handleIntroToggle = () => {
    const video = introVideoRef.current;
    if (!video) return;
    setIntroStarted(true);
    setIntroLoading(true);
    setIntroPlaying(true);
    if (!introStartMsRef.current) {
      introStartMsRef.current = Date.now();
    }
    video.play().then(() => {
      setIntroLoading(false);
    }).catch(() => {
      setIntroLoading(false);
      setIntroPlaying(false);
    });
  };

  const handleIntroContinue = () => {
    const video = introVideoRef.current;
    if (video) {
      video.pause();
    }
    setIntroStarted(false);
    setIntroPlaying(false);
    setIntroStep(1);
  };

  const handleIntroNext = () => {
    setIntroStep((step) => Math.min(step + 1, 2));
  };

  useEffect(() => {
    if (!introStarted) return;
    const video = introVideoRef.current;
    if (!video) return;
    if (Number.isFinite(video.duration)) {
      setIntroTimeLeft(Math.ceil(video.duration - video.currentTime));
    } else {
      if (introTimeLeft === null) {
        setIntroTimeLeft(introDuration ?? 0);
      }
    }
  }, [introStarted, introDuration, introTimeLeft]);

  const handleIntroClose = () => {
    if (introStep < 2) return;
    markIntroCompleted();
    setIntroOpen(false);
  };

  const hideGuideLauncher = () => {
    setGuideLauncherHidden(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUIDE_LAUNCHER_KEY, "1");
    }
  };

  const formatTime = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined) return "";
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <>
      <Drawer.Root
        open={allowIntroDrawer && introOpen}
        onOpenChange={(next) => {
          if (!next && introStep < 2) return;
          setIntroOpen(next);
        }}
        dismissible={false}
        modal
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[80] min-h-[60svh] rounded-t-3xl border border-border bg-background p-5 pt-7 pb-10 shadow-xl flex flex-col">
              <Drawer.Title className="sr-only">{copy[lang].introTitle}</Drawer.Title>
              <div className="hidden mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
              <div className="flex-1">
              {introStep === 0 ? (
                <>
                  <div className="mt-2 overflow-hidden rounded-2xl  bg-black/5 relative">
                    <video
                      ref={introVideoRef}
                      className={`h-60 w-full object-cover ${introStarted ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                      playsInline
                      preload="metadata"
                      src="https://res.cloudinary.com/dhxfkhewr/video/upload/v1770381224/intro_ryqu6j.mp4"
                    />
                    {!introStarted && (
                      <img
                        src="https://res.cloudinary.com/dhxfkhewr/image/upload/f_auto,q_auto/v1770303929/guide/guidecover.jpg"
                        alt="Maio Guide cover"
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="text-lg font-semibold text-foreground">
                      {copy[lang].introTitle}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {copy[lang].introBody}
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="text-lg font-semibold text-foreground">
                    {introStep === 1
                      ? copy[lang].mustKnowsTitle
                      : introStep === 2
                        ? copy[lang].exploreTitle
                        : ""}
                  </div>
                  {introStep === 1 && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {copy[lang].mustKnowsBody}
                      </p>
                      <div className="grid gap-3">
                        {copy[lang].mustKnowsItems.map((item) => (
                          <div
                            key={item}
                            className="rounded-md border border-border bg-background/90 p-3 text-sm text-foreground/80 shadow-sm"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {introStep === 2 && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {copy[lang].exploreBody}
                      </p>
                      <div className="grid gap-3">
                        {copy[lang].exploreItems.map((item) => (
                          <div
                            key={item}
                            className="rounded-md border border-border bg-background/90 p-3 text-sm text-foreground/80 shadow-sm"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              </div>
              <div className="mt-5 flex flex-col gap-3">
                {introStep === 0 && (
                  <>
                    {!introStarted ? (
                      <button
                        type="button"
                        onClick={handleIntroToggle}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold shadow-sm hover:bg-accent"
                      >
                        <Play className="h-4 w-4" />
                        {introLoading ? (
                          <Skeleton className="h-4 w-20 rounded-full" />
                        ) : (
                          copy[lang].introPlay
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleIntroContinue}
                        disabled={!introPlayed && !introSkipEnabled}
                        className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wide shadow-sm hover:bg-accent disabled:opacity-40"
                      >
                        {introPlayed
                          ? copy[lang].introContinue
                          : introSkipEnabled
                            ? copy[lang].introContinue
                            : copy[lang].introListening}
                      </button>
                    )}
                  </>
                )}
                {introStep > 0 && introStep < 2 && (
                  <button
                    type="button"
                    onClick={handleIntroNext}
                    className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wide shadow-sm hover:bg-accent"
                  >
                    {copy[lang].introNext}
                  </button>
                )}
                {introStep === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={handleIntroClose}
                      className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wide shadow-sm hover:bg-accent"
                    >
                      {copy[lang].introClose}
                    </button>
                  </>
                )}
              </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

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
                  prefetch
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
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide shadow-sm hover:bg-accent"
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
