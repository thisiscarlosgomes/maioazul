"use client";

import { useEffect, useMemo, useState } from "react";

type RealtimePayload = {
  ok?: boolean;
  version?: {
    version?: string;
    date?: string;
    time?: string;
    timestamp?: number;
    type?: string;
  };
  maio?: {
    name?: string;
    inscritos?: number | null;
    vagas?: number | null;
    deputadosEleitosTotal?: number;
    deputadosEleitosPorPartido?: Record<string, number>;
    lider?: {
      partidos?: string[];
      votos?: number;
      percentagem?: number;
    };
    votosPorPartido?: Array<{
      id: string;
      nome: string;
      votos: number;
      percentagem: number;
      eleitos: number;
    }>;
  };
  message?: string;
};

const nf = new Intl.NumberFormat("pt-PT");

function partyBarColor(partyId: string) {
  const id = partyId.trim().toUpperCase();
  if (id === "MPD") return "#2e7d32";
  if (id === "PAICV") return "#f2c94c";
  return "#0a3b66";
}

export default function MaioRealtimeResults() {
  const [data, setData] = useState<RealtimePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch("/api/eleicoes/resultados-maio", { cache: "no-store" });
        const payload = (await response.json()) as RealtimePayload;

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message || "Nao foi possivel obter dados em tempo real.");
        }

        if (!mounted) return;
        setData(payload);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar resultados.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const parties = useMemo(() => {
    const entries = Object.entries(data?.maio?.deputadosEleitosPorPartido ?? {});
    entries.sort((a, b) => b[1] - a[1]);
    return entries;
  }, [data]);

  const voteRace = useMemo(() => {
    const rows = data?.maio?.votosPorPartido ?? [];
    return [...rows].sort((a, b) => b.votos - a.votos);
  }, [data]);

  const mesasPendentes = useMemo(() => {
    const total = Number(data?.maio?.mesas?.total ?? 0);
    const apuradas = Number(data?.maio?.mesas?.value ?? 0);
    return Math.max(0, total - apuradas);
  }, [data]);

  const mesasResumo = useMemo(() => {
    const total = Number(data?.maio?.mesas?.total ?? 0);
    const apuradas = Number(data?.maio?.mesas?.value ?? 0);
    const pendentes = Math.max(0, total - apuradas);
    const pctApuradas = total > 0 ? (apuradas / total) * 100 : 0;
    const pctPendentes = total > 0 ? (pendentes / total) * 100 : 0;
    return { total, apuradas, pendentes, pctApuradas, pctPendentes };
  }, [data]);

  return (
    <section className="rounded-lg border border-border bg-card px-6 py-6 sm:px-8">
      <h2 className="text-base font-semibold sm:text-lg">Resultados em tempo real · Maio</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Atualizado automaticamente a cada 30 segundos (fonte: eleicoes.cv).
      </p>

      {loading ? <p className="mt-4 text-sm text-muted-foreground">A carregar...</p> : null}

      {error ? (
        <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">INSCRITOS</p>
              <p className="mt-1 text-xl font-semibold">{nf.format(data?.maio?.inscritos ?? 0)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">VAGAS (CIRCULO MAIO)</p>
              <p className="mt-1 text-xl font-semibold">{nf.format(data?.maio?.vagas ?? 0)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">DEPUTADOS ELEITOS</p>
              <p className="mt-1 text-xl font-semibold">
                {nf.format(data?.maio?.deputadosEleitosTotal ?? 0)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">MESAS POR CONCLUIR</p>
              <p className="mt-1 text-xl font-semibold">{nf.format(mesasPendentes)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">ELEITOS POR PARTIDO (MAIO)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {parties.length ? (
                parties.map(([party, count]) => (
                  <span
                    key={party}
                    className="rounded-full border border-border bg-background px-3 py-1 text-sm"
                  >
                    {party}: {count}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Sem eleitos publicados ainda.</span>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-md border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">PARTIDO NA FRENTE</p>
            <p className="mt-1 text-base font-semibold">
              {(data?.maio?.lider?.partidos ?? []).join(", ") || "N/D"}
            </p>
            <p className="text-sm text-muted-foreground">
              {nf.format(data?.maio?.lider?.votos ?? 0)} votos ·{" "}
              {(data?.maio?.lider?.percentagem ?? 0).toFixed(1)}%
            </p>
          </div>

          <div className="mt-4 rounded-md border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">PROGRESSO DAS MESAS</p>
            <p className="mt-1 text-base font-semibold">
              {nf.format(mesasResumo.pendentes)} por concluir · {mesasResumo.pctPendentes.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">
              {nf.format(mesasResumo.apuradas)} de {nf.format(mesasResumo.total)} apuradas ·{" "}
              {mesasResumo.pctApuradas.toFixed(1)}%
            </p>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${Math.max(0, Math.min(100, mesasResumo.pctApuradas))}%` }}
              />
            </div>
          </div>

          <div className="mt-4 rounded-md border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">CORRIDA DE VOTOS (%)</p>
            <div className="mt-3 space-y-3">
              {voteRace.length ? (
                voteRace.map((row) => (
                  <div key={row.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{row.id}</span>
                      <span className="text-muted-foreground">
                        {nf.format(row.votos)} · {row.percentagem.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        aria-label={`Barra ${row.id}`}
                        title={row.id}
                        style={{
                          backgroundColor: partyBarColor(row.id),
                          width: `${Math.max(0, Math.min(100, row.percentagem))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Sem votos publicados ainda.</span>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Versao {data?.version?.version ?? "-"} · {data?.version?.date ?? "--"} {data?.version?.time ?? "--"}
          </p>
        </>
      ) : null}
    </section>
  );
}
