"use client";

import { useEffect, useState } from "react";
import { fetchJsonOfflineFirst } from "@/lib/offline";

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function TourismStructuralBaseline() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchJsonOfflineFirst<{
      foreign?: {
        hotel_share?: number;
        non_hotel_share?: number;
      };
      domestic?: {
        hotel_share?: number;
        non_hotel_share?: number;
      };
    }>("/api/transparencia/turismo/2024/structure/summary")
      .then(setData);
  }, []);

  if (!data) return null;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-semibold">
          Estrutura turística (2024)
        </h2>
        <p className="text-sm text-muted-foreground">
          Composição das dormidas por tipo de alojamento (INE)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Hotéis (estrangeiros)" value={pct(data.foreign.hotel_share)} />
        <Kpi
          label="Não-hotel (estrangeiros)"
          value={pct(data.foreign.non_hotel_share)}
        />
        <Kpi label="Hotéis (residentes)" value={pct(data.domestic.hotel_share)} />
        <Kpi
          label="Não-hotel (residentes)"
          value={pct(data.domestic.non_hotel_share)}
        />
      </div>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
