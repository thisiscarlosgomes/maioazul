// lib/hooks/useTourismBaseline2024.ts
"use client";

import { useEffect, useState } from "react";
import { fetchJsonOfflineFirst } from "@/lib/offline";

export function useTourismBaseline2024() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonOfflineFirst("/api/transparencia/turismo/2024/baseline")
      .then((res) => {
        setData(res);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}
