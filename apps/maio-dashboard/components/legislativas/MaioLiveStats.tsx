"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Payload = {
  ok?: boolean;
  maio?: {
    votantes?: {
      value?: number;
      abstention?: number;
      pct?: number;
      abstention_pct?: number;
    } | null;
    votosPorPartido?: Array<{
      id: string;
      votos: number;
      percentagem: number;
    }>;
  };
};

const nf = new Intl.NumberFormat("pt-PT");

export default function MaioLiveStats() {
  const [data, setData] = useState<Payload | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch("/api/eleicoes/resultados-maio", { cache: "no-store" });
        const payload = (await response.json()) as Payload;
        if (!response.ok || !payload.ok) return;
        if (!mounted) return;
        setData(payload);
        hasDataRef.current = true;
      } catch {
        if (!mounted) return;
        if (!hasDataRef.current) setData(null);
      }
    }

    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const votosPartido = useMemo(() => {
    const rows = [...(data?.maio?.votosPorPartido ?? [])];
    rows.sort((a, b) => b.votos - a.votos);
    return rows;
  }, [data]);

  const votantes = Number(data?.maio?.votantes?.value ?? 0);
  const abstencao = Number(data?.maio?.votantes?.abstention ?? 0);
  const pctVotantes = Number(data?.maio?.votantes?.pct ?? 0);
  const pctAbstencao = Number(data?.maio?.votantes?.abstention_pct ?? 0);

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <p className="text-[11px] text-muted-foreground">Votantes</p>
        <p className="mt-1 text-base font-semibold">{nf.format(votantes)}</p>
        <p className="text-xs text-muted-foreground">{pctVotantes.toFixed(1)}%</p>
      </div>
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <p className="text-[11px] text-muted-foreground">Abstenção</p>
        <p className="mt-1 text-base font-semibold">{nf.format(abstencao)}</p>
        <p className="text-xs text-muted-foreground">{pctAbstencao.toFixed(1)}%</p>
      </div>
      {votosPartido.map((row) => (
        <div key={row.id} className="rounded-md border border-border bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">{row.id}</p>
          <p className="mt-1 text-base font-semibold">{nf.format(row.votos)}</p>
          <p className="text-xs text-muted-foreground">{row.percentagem.toFixed(1)}%</p>
        </div>
      ))}
    </div>
  );
}
