// lib/hooks/useTourismBaseline2024.ts
"use client";

import { useEffect, useState } from "react";
import { fetchJsonOfflineFirst } from "@/lib/offline";

export type TourismBaselineIsland = {
  ilha: string;
  hospedes: number;
  dormidas: number;
  avg_stay: number;
};

export type TourismBaseline2024Data = {
  islands?: TourismBaselineIsland[];
  national?: {
    hospedes?: number;
    dormidas?: number;
  };
};

export function useTourismBaseline2024() {
  const [data, setData] = useState<TourismBaseline2024Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonOfflineFirst<TourismBaseline2024Data>("/api/transparencia/turismo/2024/baseline")
      .then((res) => {
        setData(res);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}
