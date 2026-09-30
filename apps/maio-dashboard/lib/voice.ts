"use client";

import { useEffect, useState } from "react";

export type VoiceStatus = "idle" | "loading" | "playing" | "paused";

export type VoiceState = {
  status: VoiceStatus;
  title?: string;
  lang?: "pt" | "en";
  text?: string;
  placeId?: string;
};

type VoiceRuntime = {
  state: VoiceState;
  audio: HTMLAudioElement | null;
  url: string | null;
  controller: AbortController | null;
  listeners: Set<() => void>;
};

const VOICE_ID = "zGjIP4SZlMnY9m93k97r";
const MODEL_ID = "eleven_multilingual_v2";
const STORAGE_KEY = "maio-voice-persist";
const NO_TRIM_TITLES = [
  "parque natural do norte",
  "parque natural de barreiro e figueira",
  "city of porto inglês",
  "city of porto ingles",
  "porto inglês",
  "porto ingles",
  "ribeira of lagoa",
  "ribeira da lagoa",
  "ribeira de lagoa",
  "lagoa",
  "beaches of boca lagoa and seada",
  "boca lagoa",
  "seada",
];

export const getVoiceUrl = async (text: string, title?: string) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const lowerTitle = title?.toLowerCase() || "";
  const skipTrim = NO_TRIM_TITLES.some((t) => lowerTitle.includes(t));
  const trimmed = skipTrim
    ? cleaned
    : cleaned.length > 600
      ? `${cleaned.slice(0, 600)}…`
      : cleaned;
  const hashInput = `${VOICE_ID}:${MODEL_ID}:${trimmed}`;
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
  const hashArray = Array.from(new Uint8Array(digest));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
  return `/voice/${hashHex}.mp3`;
};

const getRuntime = (): VoiceRuntime | null => {
  if (typeof window === "undefined") return null;
  const existing = (window as any).__maioVoice as VoiceRuntime | undefined;
  if (existing) return existing;
  const runtime: VoiceRuntime = {
    state: { status: "idle" },
    audio: null,
    url: null,
    controller: null,
    listeners: new Set(),
  };
  (window as any).__maioVoice = runtime;

  const persistSnapshot = () => {
    if (runtime.state.status === "idle") {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
      const payload = {
        title: runtime.state.title,
        status: runtime.state.status,
        url: runtime.url,
        placeId: runtime.state.placeId,
        currentTime: runtime.audio?.currentTime || 0,
      };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const hydrate = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        title?: string;
        status?: VoiceStatus;
        url?: string;
        currentTime?: number;
        placeId?: string;
      };
      if (!data?.url) return;
      const audio = new Audio(data.url);
      runtime.audio = audio;
      runtime.url = data.url;
      bindProgressEvents(runtime, audio);
      const resumeAt =
        typeof data.currentTime === "number" && Number.isFinite(data.currentTime)
          ? data.currentTime
          : 0;
      audio.currentTime = resumeAt;
      audio.onplaying = () => {
        setState(runtime, { ...runtime.state, status: "playing" });
      };
      audio.onpause = () => {
        if (!audio.ended) {
          setState(runtime, { ...runtime.state, status: "paused" });
        }
      };
      audio.onended = () => {
        setState(runtime, { status: "idle" });
      };
      audio.onerror = () => {
        setState(runtime, { status: "idle" });
      };
      setState(runtime, {
        status: data.status === "playing" ? "paused" : data.status || "paused",
        title: data.title,
        placeId: data.placeId,
      });
    } catch {
      // ignore invalid persisted state
    }
  };

  hydrate();
  window.addEventListener("visibilitychange", persistSnapshot);
  window.addEventListener("pagehide", persistSnapshot);

  return runtime;
};

const notify = (runtime: VoiceRuntime) => {
  runtime.listeners.forEach((listener) => listener());
};

const setState = (runtime: VoiceRuntime, next: VoiceState) => {
  runtime.state = next;
  notify(runtime);
  if (typeof window !== "undefined") {
    if (next.status === "idle") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      const payload = {
        title: next.title,
        status: next.status,
        url: runtime.url,
        placeId: next.placeId,
        currentTime: runtime.audio?.currentTime || 0,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  }
};

export const getVoiceState = (): VoiceState => {
  const runtime = getRuntime();
  return runtime ? runtime.state : { status: "idle" };
};

export const subscribeVoice = (listener: () => void) => {
  const runtime = getRuntime();
  if (!runtime) return () => {};
  runtime.listeners.add(listener);
  return () => runtime.listeners.delete(listener);
};

const clearAudio = (runtime: VoiceRuntime) => {
  runtime.controller?.abort();
  runtime.controller = null;
  if (runtime.audio) {
    runtime.audio.pause();
    runtime.audio = null;
  }
  if (runtime.url) {
    URL.revokeObjectURL(runtime.url);
    runtime.url = null;
  }
};

const bindProgressEvents = (runtime: VoiceRuntime, audio: HTMLAudioElement) => {
  const notifyProgress = () => notify(runtime);
  audio.ontimeupdate = notifyProgress;
  audio.onloadedmetadata = notifyProgress;
  audio.ondurationchange = notifyProgress;
};

export const stopVoice = () => {
  const runtime = getRuntime();
  if (!runtime) return;
  clearAudio(runtime);
  setState(runtime, { status: "idle" });
};

export const pauseVoice = () => {
  const runtime = getRuntime();
  if (!runtime?.audio) return;
  runtime.audio.pause();
  setState(runtime, { ...runtime.state, status: "paused" });
};

export const resumeVoice = () => {
  const runtime = getRuntime();
  if (!runtime?.audio) return;
  runtime.audio.play();
  setState(runtime, { ...runtime.state, status: "playing" });
};

export const playVoice = async ({
  text,
  title,
  lang,
  placeId,
}: {
  text: string;
  title?: string;
  lang?: "pt" | "en";
  placeId?: string;
}) => {
  const runtime = getRuntime();
  if (!runtime || !text) return;
  clearAudio(runtime);
  setState(runtime, { status: "loading", title, lang, text, placeId });

  try {
    const url = await getVoiceUrl(text, title);
    runtime.url = url;
    const audio = new Audio(url);
    runtime.audio = audio;
    bindProgressEvents(runtime, audio);
    audio.onplaying = () => {
      setState(runtime, { ...runtime.state, status: "playing" });
    };
    audio.onpause = () => {
      if (!audio.ended) {
        setState(runtime, { ...runtime.state, status: "paused" });
      }
    };
    audio.onended = () => {
      setState(runtime, { status: "idle" });
    };
    audio.onerror = () => {
      setState(runtime, { status: "idle" });
    };
    await audio.play();
  } catch {
    setState(runtime, { status: "idle" });
  }
};

export const useVoiceState = () => {
  const [state, setStateValue] = useState<VoiceState>(getVoiceState());
  useEffect(() => subscribeVoice(() => setStateValue(getVoiceState())), []);
  return state;
};

export type VoiceProgress = {
  currentTime: number;
  duration: number;
};

type VoiceManifestMap = Record<string, string>;

const normalizeManifest = (data: any): VoiceManifestMap => {
  if (!data) return {};
  if (Array.isArray(data)) {
    return data.reduce((acc, entry) => {
      if (typeof entry === "string") {
        acc[entry] = entry;
      } else if (entry?.id && entry?.hash) {
        acc[entry.id] = entry.hash;
      }
      return acc;
    }, {} as VoiceManifestMap);
  }
  if (data.items && Array.isArray(data.items)) {
    return data.items.reduce((acc: VoiceManifestMap, entry: any) => {
      if (entry?.id && entry?.hash) acc[entry.id] = entry.hash;
      return acc;
    }, {} as VoiceManifestMap);
  }
  if (typeof data === "object") {
    return Object.keys(data).reduce((acc: VoiceManifestMap, key) => {
      const value = data[key];
      if (typeof value === "string") acc[key] = value;
      return acc;
    }, {} as VoiceManifestMap);
  }
  return {};
};

export const useVoiceManifest = () => {
  const [manifest, setManifest] = useState<VoiceManifestMap | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/voice/manifest.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        setManifest(normalizeManifest(data));
      })
      .catch(() => {
        if (!active) return;
        setManifest({});
      });
    return () => {
      active = false;
    };
  }, []);

  return manifest;
};

export const hasVoiceForId = (
  id: string | undefined | null,
  manifest: VoiceManifestMap | null
) => {
  if (!id || !manifest) return false;
  return Boolean(manifest[id]);
};

const getVoiceProgressSnapshot = (): VoiceProgress => {
  const runtime = getRuntime();
  const currentTime = runtime?.audio?.currentTime || 0;
  const duration = runtime?.audio?.duration || 0;
  return {
    currentTime: Number.isFinite(currentTime) ? currentTime : 0,
    duration: Number.isFinite(duration) ? duration : 0,
  };
};

export const useVoiceProgress = () => {
  const [progress, setProgress] = useState<VoiceProgress>(getVoiceProgressSnapshot());

  useEffect(() => {
    setProgress(getVoiceProgressSnapshot());
    return subscribeVoice(() => {
      setProgress(getVoiceProgressSnapshot());
    });
  }, []);

  return progress;
};
