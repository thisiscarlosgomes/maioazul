"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "maio-favorites";

type FavoriteListener = () => void;

const listeners = new Set<FavoriteListener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function readFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === "string");
    }
    return [];
  } catch {
    return [];
  }
}

export function writeFavorites(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("maio-favorites"));
  notifyListeners();
}

export function toggleFavorite(id: string) {
  const next = new Set(readFavorites());
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  const list = Array.from(next);
  writeFavorites(list);
  return list;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setFavorites(readFavorites());
    sync();
    listeners.add(sync);

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== STORAGE_KEY) return;
      sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("maio-favorites", sync as EventListener);

    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("maio-favorites", sync as EventListener);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const list = toggleFavorite(id);
    setFavorites(list);
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  return { favorites, favoritesSet, toggle, isFavorite };
}
