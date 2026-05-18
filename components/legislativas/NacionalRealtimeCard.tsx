"use client";

import Image from "next/image";
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
    geral?: {
      inscritos?: number;
      votantes?: {
        valor?: number;
        percentagem?: number;
      };
      abstencao?: {
        valor?: number;
        percentagem?: number;
      };
      nulos?: {
        valor?: number;
        percentagem?: number;
      };
      brancos?: {
        valor?: number;
        percentagem?: number;
      };
    };
    votosPorPartido?: Array<{
      id: string;
      votos: number;
      percentagem: number;
      eleitos: number;
    }>;
  };
  message?: string;
};

const nf = new Intl.NumberFormat("pt-PT");

function partyColor(id: string) {
  const party = id.trim().toUpperCase();
  if (party === "MPD") return "#2e7d32";
  if (party === "PAICV") return "#f2c94c";
  return "#0a3b66";
}

function partyImageSrc(id: string) {
  const party = id.trim().toUpperCase();
  if (party === "MPD") return "/partidos/mpd.jpg";
  if (party === "PAICV") return "/partidos/paicv.jpg";
  if (party === "UCID") return "/partidos/ucid.jpg";
  if (party === "PTS") return "/partidos/pts.jpg";
  if (party === "PP") return "/partidos/pp.jpg";
  return null;
}

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

  const raceAllParties = useMemo(() => {
    const rows = [...(data?.nacional?.votosPorPartido ?? [])].sort((a, b) => b.votos - a.votos);
    const totalPct = rows.reduce((acc, row) => acc + Math.max(0, row.percentagem || 0), 0);
    return rows.map((row) => ({
      ...row,
      normalizedPct: totalPct > 0 ? (Math.max(0, row.percentagem || 0) / totalPct) * 100 : 0,
    }));
  }, [data]);

  const isNearFinal = progress.pctApuradas >= 98;
  const winnerParty = (data?.nacional?.lider?.partidos ?? []).join(", ") || "N/D";

  return (
    <section className="rounded-lg border border-border bg-card px-6 py-6 sm:px-8">
      <h2 className="text-base font-semibold sm:text-lg">Resumo Global em tempo real</h2>
      <p className="mt-1 text-sm text-muted-foreground">Lider global e progresso de apuramento das mesas.</p>

      {loading && !data ? <p className="mt-4 text-sm text-muted-foreground">A carregar...</p> : null}
      {error && !data ? (
        <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          {isNearFinal ? (
            <div className="mt-5 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">
                RESULTADO GLOBAL PRATICAMENTE FINAL
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-200">
                Vencedor: {winnerParty}
              </p>
              <p className="text-sm text-emerald-700/90 dark:text-emerald-300/90">
                {progress.pctApuradas.toFixed(1)}% das mesas apuradas.
              </p>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">VOTANTES</p>
              <p className="mt-1 text-xl font-semibold">{nf.format(data?.nacional?.geral?.votantes?.valor ?? 0)}</p>
              <p className="text-sm text-muted-foreground">
                {(data?.nacional?.geral?.votantes?.percentagem ?? 0).toFixed(1)}% de {nf.format(data?.nacional?.geral?.inscritos ?? 0)} inscritos
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">ABSTENCAO</p>
              <p className="mt-1 text-xl font-semibold">{nf.format(data?.nacional?.geral?.abstencao?.valor ?? 0)}</p>
              <p className="text-sm text-muted-foreground">
                {(data?.nacional?.geral?.abstencao?.percentagem ?? 0).toFixed(1)}%
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">NULOS</p>
              <p className="mt-1 text-xl font-semibold">{nf.format(data?.nacional?.geral?.nulos?.valor ?? 0)}</p>
              <p className="text-sm text-muted-foreground">
                {(data?.nacional?.geral?.nulos?.percentagem ?? 0).toFixed(1)}%
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">BRANCOS</p>
              <p className="mt-1 text-xl font-semibold">{nf.format(data?.nacional?.geral?.brancos?.valor ?? 0)}</p>
              <p className="text-sm text-muted-foreground">
                {(data?.nacional?.geral?.brancos?.percentagem ?? 0).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">
                {isNearFinal ? "PARTIDO VENCEDOR (GLOBAL)" : "PARTIDO NA FRENTE (GLOBAL)"}
              </p>
              <p className="mt-1 text-xl font-semibold">
                {winnerParty}
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

          <div className="mt-4 rounded-md border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">CORRIDA GLOBAL (TODOS OS PARTIDOS)</p>
            <div className="mt-2 space-y-2">
              {raceAllParties.map((row) => (
                <div key={row.id} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 font-medium">
                    {partyImageSrc(row.id) ? (
                      <Image
                        src={partyImageSrc(row.id) || ""}
                        alt={row.id}
                        width={18}
                        height={18}
                        className="h-[18px] w-[18px] rounded-full object-cover"
                      />
                    ) : null}
                    <span>{row.id}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {nf.format(row.votos)} · {row.percentagem.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {raceAllParties.map((row) => (
                <span key={`pct-${row.id}`} className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: partyColor(row.id) }}
                  />
                  <span>
                    {row.id}: {row.percentagem.toFixed(1)}%
                  </span>
                </span>
              ))}
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
              {raceAllParties.map((row) => (
                <div
                  key={`seg-${row.id}`}
                  className="h-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, row.normalizedPct))}%`,
                    backgroundColor: partyColor(row.id),
                    float: "left",
                  }}
                />
              ))}
            </div>
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
