"use client";

import { useEffect, useRef, useState } from "react";

type UseDashboardQueryOptions<T> = {
  enabled?: boolean;
  depsKey?: string;
  queryFn: () => Promise<T>;
};

export function useDashboardQuery<T>({
  enabled = true,
  depsKey = "default",
  queryFn,
}: UseDashboardQueryOptions<T>) {
  const queryFnRef = useRef(queryFn);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });

    queryFnRef.current()
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
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, depsKey]);

  return { data, loading, error };
}
