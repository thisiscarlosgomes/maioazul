"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

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
    mesas?: {
      total?: number;
      value?: number;
      pct?: number;
    } | null;
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

function partyImageSrc(id: string) {
  const party = id.trim().toUpperCase();
  if (party === "MPD") return "/partidos/mpd.jpg";
  if (party === "PAICV") return "/partidos/paicv.jpg";
  if (party === "UCID") return "/partidos/ucid.jpg";
  if (party === "PTS") return "/partidos/pts.jpg";
  if (party === "PP") return "/partidos/pp.jpg";
  return null;
}

export default function MaioRealtimeResults() {
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
          throw new Error(payload.message || "Nao foi possivel obter dados em tempo real.");
        }

        if (!mounted) return;
        setData(payload);
        hasDataRef.current = true;
        setLastUpdatedAt(Date.now());
        setError(null);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Falha ao carregar resultados.";
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

  const finalResult = useMemo(() => {
    const total = mesasResumo.total;
    const apuradas = mesasResumo.apuradas;
    const isFinal = total > 0 && apuradas >= total;
    const first = voteRace[0];
    const second = voteRace[1];

    if (!isFinal || !first) {
      return { isFinal: false, headline: "", detail: "", winnerId: "" };
    }

    const isTie = !!second && first.votos === second.votos;
    if (isTie) {
      return {
        isFinal: true,
        headline: "Resultado Final: Empate técnico",
        detail: `${first.id} e ${second.id} com ${nf.format(first.votos)} votos cada.`,
        winnerId: "",
      };
    }

    return {
      isFinal: true,
      headline: `Resultado Final: ${first.id} venceu em Maio`,
      detail: `${nf.format(first.votos)} votos · ${first.percentagem.toFixed(1)}%`,
      winnerId: first.id,
    };
  }, [mesasResumo.apuradas, mesasResumo.total, voteRace]);

  return (
    <section className="rounded-lg border border-border bg-card px-6 py-6 sm:px-8">
      <h2 className="text-base font-semibold sm:text-lg">Resultados em tempo real · Maio</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Atualizado automaticamente a cada 30 segundos (fonte: eleicoes.cv).
      </p>

      {finalResult.isFinal ? (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {finalResult.headline}
            </p>
            <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/90">
              {finalResult.detail}
            </p>
          </div>
          {finalResult.winnerId && partyImageSrc(finalResult.winnerId) ? (
            <Image
              src={partyImageSrc(finalResult.winnerId) || ""}
              alt={finalResult.winnerId}
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full border border-emerald-500/40 object-cover"
            />
          ) : null}
        </div>
      ) : null}

      {data ? (
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
      ) : null}

      {loading && !data ? <p className="mt-4 text-sm text-muted-foreground">A carregar...</p> : null}

      {error && !data ? (
        <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {data ? (
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

          {!finalResult.isFinal ? (
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
          ) : null}

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
