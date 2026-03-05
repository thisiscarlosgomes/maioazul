"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;

type CacheEntry = {
  data: unknown;
  expiresAt: number;
};

const queryCache = new Map<string, CacheEntry>();
const inflightQueryCache = new Map<string, Promise<unknown>>();

type UseDashboardQueryOptions<T> = {
  enabled?: boolean;
  depsKey?: string;
  staleTimeMs?: number;
  queryFn: () => Promise<T>;
};

export function useDashboardQuery<T>({
  enabled = true,
  depsKey = "default",
  staleTimeMs = DEFAULT_STALE_TIME_MS,
  queryFn,
}: UseDashboardQueryOptions<T>) {
  const initialCached = queryCache.get(depsKey);
  const hasInitialCached = Boolean(initialCached);
  const queryFnRef = useRef(queryFn);
  const [data, setData] = useState<T | null>(() => {
    if (!hasInitialCached) return null;
    return (initialCached as CacheEntry).data as T;
  });
  const [loading, setLoading] = useState<boolean>(enabled && !hasInitialCached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const cached = queryCache.get(depsKey);
    if (cached && cached.expiresAt > Date.now()) {
      queueMicrotask(() => {
        if (cancelled) return;
        setData(cached.data as T);
        setLoading(false);
        setError(null);
      });
      return;
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });

    const existingInflight = inflightQueryCache.get(depsKey) as
      | Promise<T>
      | undefined;
    const request =
      existingInflight ??
      queryFnRef.current().then((res) => {
        queryCache.set(depsKey, {
          data: res,
          expiresAt: Date.now() + Math.max(1000, staleTimeMs),
        });
        return res;
      });

    if (!existingInflight) {
      inflightQueryCache.set(depsKey, request as Promise<unknown>);
    }

    request
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(
          err instanceof Error ? err.message : "Falha ao carregar dados."
        );
      })
      .finally(() => {
        inflightQueryCache.delete(depsKey);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, depsKey, staleTimeMs]);

  return { data, loading, error };
}
