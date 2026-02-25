"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "pt";

const STORAGE_KEY = "maio-lang";
const EVENT_NAME = "maio-lang-change";

const readStoredLang = (): Lang => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "pt" || stored === "en" ? stored : "en";
};

const writeStoredLang = (lang: Lang) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new Event(EVENT_NAME));
};

export const useLang = () => {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    const handle = () => setLangState(readStoredLang());
    window.addEventListener("storage", handle);
    window.addEventListener(EVENT_NAME, handle);
    return () => {
      window.removeEventListener("storage", handle);
      window.removeEventListener(EVENT_NAME, handle);
    };
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    writeStoredLang(next);
  };

  return [lang, setLang] as const;
};
