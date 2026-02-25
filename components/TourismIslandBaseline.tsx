"use client";

import { useEffect, useState } from "react";
import { fetchJsonOfflineFirst } from "@/lib/offline";

/* =========================
   Utils
========================= */

const formatNumber = (v: number) =>
  new Intl.NumberFormat("pt-PT").format(v);

const formatPct = (v: number | null | undefined) => {
  if (typeof v !== "number") return "—";
  return `${(v * 100).toFixed(1)}%`;
};

/* =========================
   Component
========================= */

export function TourismIslandBaseline({
  ilha,
  year = 2024,
}: {
  ilha: string;
  year?: number;
}) {
  const [data, setData] = useState<{
    hospedes?: number;
    dormidas?: number;
    avg_stay?: number | null;
    dormidasShareNational?: number | null;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ilha || ilha === "Todas") {
      setData(null);
      return;
    }

    setLoading(true);

    fetchJsonOfflineFirst<{
      hospedes?: number;
      dormidas?: number;
      avg_stay?: number | null;
      dormidasShareNational?: number | null;
    }>(`/api/transparencia/turismo/${year}/island?ilha=${encodeURIComponent(ilha)}`)
      .then((res) => {
        setData(res || null);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, [ilha, year]);

  if (loading) {
    return (
      <section className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-lg border border-border bg-card animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-semibold">
          Turismo · Escala anual ({year})
        </h2>
        <p className="text-sm text-muted-foreground">
          Indicadores agregados do ano base (INE Cabo Verde)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label={`Hóspedes (${year})`}
          value={
            typeof data.hospedes === "number"
              ? formatNumber(data.hospedes)
              : "—"
          }
        />

        <Kpi
          label={`Dormidas (${year})`}
          value={
            typeof data.dormidas === "number"
              ? formatNumber(data.dormidas)
              : "—"
          }
        />

        <Kpi
          label="Estadia média"
          value={
            typeof data.avg_stay === "number"
              ? `${data.avg_stay.toFixed(2)} noites`
              : "—"
          }
        />

        <Kpi
          label="% do total nacional"
          value={formatPct(data.dormidasShareNational)}
        />
      </div>
    </section>
  );
}

/* =========================
   KPI
========================= */

function Kpi({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">
        {value}
      </div>
    </div>
  );
}
