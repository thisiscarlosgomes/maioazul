"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RealtimePayload = {
  ok?: boolean;
  version?: {
    version?: string;
    date?: string;
    time?: string;
  };
  nacional?: {
    lider?: {
      partidos?: string[];
      votos?: number;
      percentagem?: number;
      totalVotosContados?: number;
    };
    mesas?: {
      total?: number;
      apuradas?: number;
      percentagem?: number;
    };
  };
  message?: string;
};

const nf = new Intl.NumberFormat("pt-PT");

export default function NacionalRealtimeCard() {
  const [data, setData] = useState<RealtimePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function load(initial = false) {
      try {
        if (!initial) setRefreshing(true);
        const response = await fetch("/api/eleicoes/resultados-maio", { cache: "no-store" });
        const payload = (await response.json()) as RealtimePayload;

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message || "Nao foi possivel obter dados nacionais.");
        }

        if (!mounted) return;
        setData(payload);
        hasDataRef.current = true;
        setLastUpdatedAt(Date.now());
        setError(null);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Falha ao carregar dados nacionais.";
        if (!hasDataRef.current) {
          setError(message);
        } else {
          setError(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load(true);
    const id = window.setInterval(() => load(false), 30_000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const progress = useMemo(() => {
    const total = Number(data?.nacional?.mesas?.total ?? 0);
    const apuradas = Number(data?.nacional?.mesas?.apuradas ?? 0);
    const pendentes = Math.max(0, total - apuradas);
    const pctApuradas = total > 0 ? (apuradas / total) * 100 : 0;
    const pctPendentes = total > 0 ? (pendentes / total) * 100 : 0;
    return { total, apuradas, pendentes, pctApuradas, pctPendentes };
  }, [data]);

  return (
    <section className="rounded-lg border border-border bg-card px-6 py-6 sm:px-8">
      <h2 className="text-base font-semibold sm:text-lg">Resumo Nacional em tempo real</h2>
      <p className="mt-1 text-sm text-muted-foreground">Lider nacional e progresso de apuramento das mesas.</p>

      {loading && !data ? <p className="mt-4 text-sm text-muted-foreground">A carregar...</p> : null}
      {error && !data ? (
        <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">PARTIDO NA FRENTE (NACIONAL)</p>
              <p className="mt-1 text-xl font-semibold">
                {(data?.nacional?.lider?.partidos ?? []).join(", ") || "N/D"}
              </p>
              <p className="text-sm text-muted-foreground">
                {nf.format(data?.nacional?.lider?.votos ?? 0)} votos · {(data?.nacional?.lider?.percentagem ?? 0).toFixed(1)}%
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">MESAS AINDA POR CONCLUIR</p>
              <p className="mt-1 text-xl font-semibold">
                {nf.format(progress.pendentes)} · {progress.pctPendentes.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">
                {nf.format(progress.apuradas)} de {nf.format(progress.total)} apuradas · {progress.pctApuradas.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${Math.max(0, Math.min(100, progress.pctApuradas))}%` }}
            />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Versao {data?.version?.version ?? "-"} · {data?.version?.date ?? "--"} {data?.version?.time ?? "--"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {refreshing
              ? "A atualizar dados..."
              : lastUpdatedAt
                ? `Última atualização local: ${new Date(lastUpdatedAt).toLocaleTimeString("pt-PT")}`
                : ""}
          </p>
        </>
      ) : null}
    </section>
  );
}
