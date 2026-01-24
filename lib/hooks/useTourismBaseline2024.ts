// lib/hooks/useTourismBaseline2024.ts
"use client";

import { useEffect, useState } from "react";

export function useTourismBaseline2024() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transparencia/turismo/2024/baseline")
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}
