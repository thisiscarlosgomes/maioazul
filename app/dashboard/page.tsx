"use client";

import { useEffect, useState, useRef, useMemo, type ReactNode } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

import { ThemeToggle } from "@/components/theme-toggle";
import { dictionary, type Locale } from "@/lib/i18n";
import { buildIslandTldr } from "@/lib/tldr";
import { TldrDrawer } from "@/components/TldrDrawer";

import { Sparkles } from "lucide-react";

import { TourismAccommodationTable } from "@/components/TourismAccommodationTable";
import { TourismStructuralBaseline } from "@/components/TourismStructuralBaseline";
import { TourismIslandBaseline } from "@/components/TourismIslandBaseline";

import { HospedesDormidasStackedChart } from "@/components/dashboard/HospedesDormidasStackedChart";
import { SectionBlock } from "@/components/dashboard/SectionBlock";
import { KpiGrid, KpiStat } from "@/components/dashboard/KpiStat";

import {
  useTourismBaseline2024,
  type TourismBaselineIsland,
} from "@/lib/hooks/useTourismBaseline2024";
import { useDashboardQuery } from "@/lib/hooks/useDashboardQuery";
import {
  buildReceitasSummary,
  buildReceitasTableRows,
  findReceitasYear,
  normalizeReceitasYears,
} from "@/lib/dashboard/selectors";
import type { ReceitasApiResponse, ReceitasYear } from "@/lib/dashboard/types";
import { fetchJsonOfflineFirst } from "@/lib/offline";


/* =========================
   Constants & Utils
========================= */

const ALL_ISLANDS_LABEL = "Todas as Ilhas";
const ISLANDS = [ALL_ISLANDS_LABEL, "Maio"];
const YEARS = ["2026", "2025", "2024"];

type YearCapabilities = {
  hasBaseline2024: boolean;
  hasLiveTourism: boolean;
  hasLocalGovernment: boolean;
  hasInsights: boolean;
  note?: string;
};

const YEAR_CAPABILITIES: Record<string, YearCapabilities> = {
  "2024": {
    hasBaseline2024: true,
    hasLiveTourism: false,
    hasLocalGovernment: true,
    hasInsights: false,
    note: "2024 apresenta baseline estrutural anual. Transferências municipais estão disponíveis como fecho anual; indicadores dinâmicos e leitura integrada só estão disponíveis a partir de 2025.",
  },
  "2025": {
    hasBaseline2024: false,
    hasLiveTourism: true,
    hasLocalGovernment: true,
    hasInsights: true,
    note: "Para 2025, os indicadores de turismo ainda não incluem o Q4 (tanto em 'Todas as Ilhas' como nas visões por ilha).",
  },
  "2026": {
    hasBaseline2024: false,
    hasLiveTourism: false,
    hasLocalGovernment: true,
    hasInsights: false,
    note: "Para 2026, o dashboard tem dados nacionais de receitas por recebedoria e transferências municipais em atualização mensal.",
  },
};

const formatNumber = (v: number) =>
  new Intl.NumberFormat("pt-PT").format(v);

const formatRatio = (v: unknown) =>
  typeof v === "number" && !Number.isNaN(v) ? v.toFixed(2) : "—";

const formatCVE = (value: number) =>
  `${new Intl.NumberFormat("pt-PT", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  }).format(value)} CVE`;

const formatPercent = (value: number) => `${value.toFixed(2)}%`;
const formatDeltaPercent = (value: number | null) =>
  value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const formatShortDate = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("pt-PT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(iso))
    : "—";

type DashboardDictionary = (typeof dictionary)[Locale];

type DerivedPopulationData = {
  population?: number;
  populationShareNational?: number;
};

type DerivedMetricsData = {
  tourismPressure?: number;
  seasonality?: number;
};

type DerivedTourismOverviewData = {
  dormidas?: number;
  hospedes?: number;
  dormidasShareNational?: number;
  hospedesShareNational?: number;
  avgStay?: number;
  domesticShare?: number;
};

type DerivedReceitasData = {
  year?: number;
  total?: number;
  island?: number;
  islandLabel?: string;
  shareNational?: number;
};

type CoreMetricApiRow = {
  metric?: string;
  value?: number;
  breakdown?: unknown;
};

type LocalGovernmentApiRow = {
  month?: number | string;
  valor_pago?: number | string;
};

type LocalGovernmentApiResponse = {
  data?: LocalGovernmentApiRow[];
  year?: number;
};

const CMMAIO_TRANSFER_FALLBACK: Record<string, LocalGovernmentApiRow[]> = {
  "2024": [{ month: 12, valor_pago: 125537932 }],
  "2025": [{ month: 12, valor_pago: 107960558 }],
  "2026": [{ month: 1, valor_pago: 9219167 }],
};

type CountryDependencyApiCountry = {
  pais?: string;
  hospedes?: number;
  share?: number;
};

type CountryDependencyApiResponse = {
  data?: Array<{
    countries?: CountryDependencyApiCountry[];
  }>;
};

type TourismHotelsApiIsland = {
  ilha?: string;
  totals?: {
    establishments?: number;
    staff?: number;
    staff_per_establishment?: number;
  };
};

type TourismHotelsDisplayRow = {
  ilha: string;
  estabelecimentos: string;
  trabalhadores: string;
  trabalhadores_por_estabelecimento: string;
  _highlight: boolean;
};

type TourismPopulationApiRow = {
  ilha?: string;
  population?: number;
  population_share_national?: number;
};

type TourismOverviewApiIsland = {
  ilha?: string;
  dormidas?: number;
  hospedes?: number;
  avg_stay?: number;
  occupancy_rate?: number;
  domestic_share?: number;
};

type TourismOverviewApiResponse = {
  islands?: TourismOverviewApiIsland[];
  total?: {
    dormidas?: number;
    hospedes?: number;
  };
};

type TourismPressureApiRow = {
  ilha?: string;
  hospedes?: number;
  dormidas?: number;
  population?: number;
  pressure_index?: number;
};

type SeasonalityApiRow = {
  ilha?: string;
  q1_dormidas?: number;
  q3_dormidas?: number;
  seasonality_index?: number;
};

type DataTableObjectCell = {
  value: ReactNode;
  className?: string;
};

type DataTablePrimitiveCell = string | number | null | undefined | ReactNode;
type DataTableCellValue = DataTablePrimitiveCell | DataTableObjectCell;
type DataTableRow = Record<string, DataTableCellValue>;

function isDataTableObjectCell(cell: unknown): cell is DataTableObjectCell {
  return (
    typeof cell === "object" &&
    cell !== null &&
    "value" in cell &&
    Object.prototype.hasOwnProperty.call(cell, "value")
  );
}


function MaioPopulationSnapshot({
  t,
  onData,
}: {
  t: DashboardDictionary;
  onData?: (data: Record<string, number>) => void;
}) {
  const [data, setData] = useState<Record<string, number> | null>(null);

  const METRICS = t.maioCoreMetrics.metrics;

  useEffect(() => {
    fetchJsonOfflineFirst<{
      data?: CoreMetricApiRow[];
    }>("/api/transparencia/municipal/maio/core-metrics?year=2025")
      .then((res) => {
        const map: Record<string, number> = {};

        (res.data || []).forEach((r) => {
          if (r?.breakdown === null && typeof r.metric === "string" && typeof r.value === "number") {
            map[r.metric] = r.value;
          }
        });

        setData(map);
        onData?.(map); // 👈 expose data upward
      });

  }, []);

  /* Skeleton */
  if (!data) {
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

  return (
    <section className="space-y-2">

      <div>
        <h2 className="capitalize font-semibold">{t.localPopulation}</h2>
        <p className="text-sm text-muted-foreground">
          Ultimos dados da ine.cv
        </p>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label={METRICS.total_population.label}
          value={formatNumber(data.total_population)}
        />

        <Kpi
          label={METRICS.population_share_national.label}
          value={`${data.population_share_national}%`}
        />

        <Kpi
          label={METRICS.unemployment_rate.label}
          value={`${data.unemployment_rate}%`}
        />

        <Kpi
          label={METRICS.total_households.label}
          value={formatNumber(data.total_households)}
        />
      </div>
    </section>
  );
}



function LocalGovernmentOverview({
  t,
  year,
}: {
  t: DashboardDictionary;
  year: string;
}) {
  const [data, setData] = useState<LocalGovernmentApiRow[]>([]);
  const [apiYear, setApiYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const MAIO_POPULATION = 6411;

  useEffect(() => {
    let cancelled = false;

    async function loadTransfers() {
      const url = `/api/transparencia/municipal/transferencias?municipio=CMMAIO&year=${year}`;

      const normalize = (payload: unknown): LocalGovernmentApiResponse => {
        if (
          payload &&
          typeof payload === "object" &&
          "data" in payload &&
          Array.isArray((payload as LocalGovernmentApiResponse).data)
        ) {
          return payload as LocalGovernmentApiResponse;
        }
        return {};
      };

      try {
        const offlineFirst = normalize(
          await fetchJsonOfflineFirst<LocalGovernmentApiResponse>(url)
        );

        let rows = offlineFirst.data || [];
        let resolvedYear =
          typeof offlineFirst.year === "number"
            ? offlineFirst.year
            : Number(year);

        // If offline cache came back empty/malformed, force a live read.
        if (!rows.length) {
          const liveRes = await fetch(url, { cache: "no-store" });
          const liveJson = normalize(await liveRes.json());
          if (Array.isArray(liveJson.data) && liveJson.data.length) {
            rows = liveJson.data;
            resolvedYear =
              typeof liveJson.year === "number"
                ? liveJson.year
                : resolvedYear;
          }
        }

        // Last-resort fallback for CMMAIO yearly snapshots.
        if (!rows.length) {
          rows = CMMAIO_TRANSFER_FALLBACK[year] || [];
        }

        if (cancelled) return;
        setData(rows);
        setApiYear(resolvedYear || null);
      } catch {
        if (cancelled) return;
        setData(CMMAIO_TRANSFER_FALLBACK[year] || []);
        setApiYear(Number(year) || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTransfers();

    return () => {
      cancelled = true;
    };
  }, [year]);

  if (loading) {
    return (
      <section className="space-y-2">
        <div>
          <h2 className="font-semibold">{t.localGovernment}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const months = data
    .map((r) => ({
      month: Number(r.month),
      valor: Number(r.valor_pago || 0),
    }))
    .filter((r) => r.month >= 1 && r.month <= 12);

  const totalYear = months.reduce((s, r) => s + r.valor, 0);
  const isAnnualSnapshot =
    months.length === 1 && months[0]?.month === 12;
  const lastMonth =
    months.length > 0
      ? months.sort((a, b) => b.month - a.month)[0]
      : null;
  const avgMonthly =
    months.length > 0
      ? totalYear / (isAnnualSnapshot ? 12 : months.length)
      : 0;
  const perCitizen = totalYear / MAIO_POPULATION;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-semibold">{t.localGovernment}</h2>
        <p className="text-sm text-muted-foreground">
          {t.localGovernmentDesc}
          {apiYear ? ` · ano ${apiYear}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label={
            isAnnualSnapshot && apiYear
              ? `Fecho anual (${apiYear})`
              : lastMonth && apiYear
              ? `Mais Recente (${String(lastMonth.month).padStart(2, "0")}/${apiYear})`
              : "Mais Recente"
          }
          value={lastMonth ? formatCVE(lastMonth.valor) : "—"}
        />
        <Kpi label="Total anual" value={formatCVE(totalYear)} />
        <Kpi label="Média mensal" value={formatCVE(avgMonthly)} />
        <Kpi label="Por residente" value={formatCVE(perCitizen)} />
      </div>
    </section>
  );
}






function CountryDependency({
  ilha,
  year,
  t,
}: {
  ilha: string;
  year: string;
  t: DashboardDictionary;
}) {
  const { data, loading, error } = useDashboardQuery<CountryDependencyApiResponse>({
    enabled: ilha !== ALL_ISLANDS_LABEL,
    depsKey: `${ilha}-${year}`,
    queryFn: async () =>
      fetchJsonOfflineFirst<CountryDependencyApiResponse>(
        `/api/transparencia/turismo/dependency?ilha=${ilha}&year=${year}`
      ),
  });

  const rows =
    data?.data?.[0]?.countries
      ?.slice()
      .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))
      .map((c) => ({
        país: c.pais,
        hóspedes: formatNumber(c.hospedes ?? 0),
        percentagem: `${((c.share ?? 0) * 100).toFixed(1)}%`,
      })) ?? [];

  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-semibold">{t.dependency}</h2>
      </div>

      {ilha === ALL_ISLANDS_LABEL ? (
        <p className="text-sm text-muted-foreground">
          Selecione uma ilha para ver o detalhe por país.
        </p>
      ) : (
        <DataTable rows={rows} loading={loading} error={error} />
      )}
    </section>
  );
}


function TourismHotelsTable({
  highlightIsland,
}: {
  highlightIsland?: string;
}) {
  const [rows, setRows] = useState<TourismHotelsDisplayRow[]>([]);

  useEffect(() => {
    fetchJsonOfflineFirst<{
      islands?: TourismHotelsApiIsland[];
    }>("/api/transparencia/turismo/hoteis")
      .then((res) => {
        const data =
          res.islands?.map((i) => ({
            ilha: i.ilha ?? "—",
            estabelecimentos: formatNumber(i.totals?.establishments ?? 0),
            trabalhadores: formatNumber(i.totals?.staff ?? 0),
            trabalhadores_por_estabelecimento: i.totals?.staff_per_establishment
              ? i.totals.staff_per_establishment.toFixed(2)
              : "—",
            _highlight: (i.ilha ?? "") === highlightIsland,
          })) || [];

        setRows(data);
      });
  }, [highlightIsland]);

  if (!rows.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">
          Estrutura hoteleira por ilha
        </h2>
        <p className="text-sm text-muted-foreground">
          Número de estabelecimentos e emprego direto no turismo
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ilha</TableHead>
              <TableHead>Estabelecimentos</TableHead>
              <TableHead>Trabalhadores</TableHead>
              <TableHead>Trab. / Estab.</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((r, i) => (
              <TableRow
                key={i}
                className={
                  r._highlight
                    ? "bg-amber-500/10"
                    : undefined
                }
              >
                <TableCell className="font-medium">
                  {r.ilha}
                </TableCell>
                <TableCell>{r.estabelecimentos}</TableCell>
                <TableCell>{r.trabalhadores}</TableCell>
                <TableCell>{r.trabalhadores_por_estabelecimento}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}


function Kpi({ label, value }: { label: string; value: string }) {
  return <KpiStat label={label} value={value} />;
}

function getReceitaBand(sharePercent: number) {
  if (sharePercent < 1) {
    return {
      label: "residual",
      className: "bg-muted text-foreground",
    };
  }

  if (sharePercent < 5) {
    return {
      label: "intermédia",
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    };
  }

  if (sharePercent < 15) {
    return {
      label: "relevante",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  }

  return {
    label: "dominante",
    className: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300",
  };
}

function ReceitasSection({
  ilha,
  year,
  onData,
}: {
  ilha: string;
  year: string;
  onData?: (data: {
    year: number;
    total: number;
    island: number;
    islandLabel: string;
    shareNational: number;
  }) => void;
}) {
  const lastEmittedRef = useRef<string | null>(null);
  const { data, loading, error } = useDashboardQuery<ReceitasApiResponse>({
    depsKey: "receitas-cv",
    queryFn: async () =>
      fetchJsonOfflineFirst<ReceitasApiResponse>(
        "/api/transparencia/nacional/receitas/cv"
      ),
  });

  const rows = useMemo(() => normalizeReceitasYears(data), [data]);

  const selected = useMemo(
    () => findReceitasYear(rows, year),
    [rows, year]
  );

  const selectedIslandLabel = ilha === ALL_ISLANDS_LABEL ? "Maio" : ilha;
  const previousYear = useMemo<ReceitasYear | undefined>(() => {
    if (!selected) return undefined;
    return rows.find((r) => r.year === selected.year - 1);
  }, [rows, selected]);
  const summary = selected
    ? buildReceitasSummary(selected, previousYear, selectedIslandLabel)
    : null;

  useEffect(() => {
    if (!selected || !summary || ilha === ALL_ISLANDS_LABEL) return;
    const signature = `${selected.year}:${selected.total}:${selectedIslandLabel}:${summary.island}:${summary.share.toFixed(
      6
    )}`;
    if (lastEmittedRef.current === signature) return;
    lastEmittedRef.current = signature;

    onData?.({
      year: selected.year,
      total: selected.total,
      island: summary.island,
      islandLabel: selectedIslandLabel,
      shareNational: summary.share,
    });
  }, [selected, summary, ilha, selectedIslandLabel, onData]);

  if (!selected && loading) {
    return (
      <section className="space-y-2">
        <div>
          <h2 className="font-semibold">Receitas ({year})</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!selected && error) {
    return (
      <section className="space-y-2">
        <div>
          <h2 className="font-semibold">Receitas ({year})</h2>
          <p className="text-sm text-muted-foreground">
            Falha ao carregar dados de receitas.
          </p>
        </div>
      </section>
    );
  }

  if (!selected) {
    return (
      <section className="space-y-2">
        <div>
          <h2 className="font-semibold">Receitas ({year})</h2>
          <p className="text-sm text-muted-foreground">
            Sem dados de receitas para o ano selecionado.
          </p>
        </div>
      </section>
    );
  }

  const tableRows = buildReceitasTableRows(
    selected,
    previousYear,
    ilha,
    ALL_ISLANDS_LABEL
  ).map((r) => ({
    ranking: `${r.rank}º`,
    ilha: r.ilha,
    receitas: formatCVE(r.value),
    peso_no_total: (() => {
      const band = getReceitaBand(r.share);

      return (
        <div className="flex items-center gap-2">
          <span>{formatPercent(r.share)}</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${band.className}`}
          >
            {band.label}
          </span>
        </div>
      );
    })(),
    variação_yoy: formatDeltaPercent(r.yoy),
  }));

  return (
    <SectionBlock
      title={`Receitas (${year})`}
      description={`Receita arrecadada por recebedorias. Fonte: ${
        data?.source || "Portal Transparência CV"
      } · Atualizado: ${formatShortDate(data?.updatedAt || null)}${
        data?.fallback ? " · modo fallback" : ""
      }`}
    >
      <KpiGrid>
        <KpiStat label="Total arrecadado" value={formatCVE(selected.total)} />
        <KpiStat
          label={`Receitas de ${selectedIslandLabel}`}
          value={formatCVE(summary?.island ?? 0)}
        />
        <KpiStat
          label={`Peso de ${selectedIslandLabel}`}
          value={formatPercent(summary?.share ?? 0)}
        />
        <KpiStat
          label={`Variação YoY de ${selectedIslandLabel}`}
          value={formatDeltaPercent(summary?.islandYoY ?? null)}
        />
      </KpiGrid>

      <DataTable rows={tableRows} loading={loading} error={error} />
    </SectionBlock>
  );
}

function IslandPopulationSnapshot({
  ilha,
  onData,
}: {
  ilha: string;
  onData?: (data: {
    population?: number;
    populationShareNational?: number;
  }) => void;
}) {
  useEffect(() => {
    if (ilha === ALL_ISLANDS_LABEL) return;

    fetchJsonOfflineFirst<{
      data?: TourismPopulationApiRow[];
    }>(`/api/transparencia/turismo/population?year=2025`)
      .then((res) => {
        const row = res.data?.find(
          (r) => (r.ilha ?? "").toLowerCase() === ilha.toLowerCase()
        );

        if (!row) return;

        onData?.({
          population: row.population,
          populationShareNational: row.population_share_national,
        });
      });
  }, [ilha, onData]);

  return null;
}

function AllIslandsTourismTotals({ year }: { year: string }) {
  const isBaselineYear = year === "2024";
  const { data, loading, error } = useDashboardQuery<{
    islands?: TourismOverviewApiIsland[];
    source?: string;
    national?: {
      hospedes?: number;
      dormidas?: number;
    };
  }>({
    depsKey: `tourism-overview-all-${year}-${isBaselineYear ? "baseline" : "live"}`,
    queryFn: async () => {
      if (isBaselineYear) {
        return fetchJsonOfflineFirst<{
          islands?: TourismOverviewApiIsland[];
          source?: string;
          national?: {
            hospedes?: number;
            dormidas?: number;
          };
        }>("/api/transparencia/turismo/2024/baseline");
      }

      return fetchJsonOfflineFirst<TourismOverviewApiResponse>(
        `/api/transparencia/turismo/overview?year=${year}`
      );
    },
  });

  const islands = (data?.islands || []).filter(
    (row) => row.ilha && row.ilha !== "Todas as ilhas"
  );

  const totalsFromIslands = islands.reduce<{
    hospedes: number;
    dormidas: number;
  }>(
    (acc, row) => {
      acc.hospedes += Number(row.hospedes ?? 0);
      acc.dormidas += Number(row.dormidas ?? 0);
      return acc;
    },
    { hospedes: 0, dormidas: 0 }
  );

  const totals = {
    hospedes:
      Number(data?.national?.hospedes ?? 0) > 0
        ? Number(data?.national?.hospedes ?? 0)
        : totalsFromIslands.hospedes,
    dormidas:
      Number(data?.national?.dormidas ?? 0) > 0
        ? Number(data?.national?.dormidas ?? 0)
        : totalsFromIslands.dormidas,
  };

  const ranked = islands
    .slice()
    .sort((a, b) => Number(b.hospedes ?? 0) - Number(a.hospedes ?? 0));

  const topIsland = ranked[0];
  const lastIsland = ranked[ranked.length - 1];

  return (
    <SectionBlock
      title={`Turismo (${year})`}
      description={`Totais anuais nacionais por ilha. Fonte: ${
        data?.source || "INE Cabo Verde · Turismo"
      }`}
    >
      <KpiGrid>
        <KpiStat
          label="Hóspedes"
          value={
            loading
              ? " "
              : error
                ? "—"
                : formatNumber(totals.hospedes)
          }
        />
        <KpiStat
          label="Dormidas"
          value={
            loading
              ? " "
              : error
                ? "—"
                : formatNumber(totals.dormidas)
          }
        />
        <KpiStat
          label="Top island"
          value={
            loading
              ? " "
              : topIsland?.ilha
                ? `${topIsland.ilha} · ${formatNumber(Number(topIsland.hospedes ?? 0))}`
                : "—"
          }
        />
        <KpiStat
          label="Last island"
          value={
            loading
              ? " "
              : lastIsland?.ilha
                ? `${lastIsland.ilha} · ${formatNumber(Number(lastIsland.hospedes ?? 0))}`
                : "—"
          }
        />
      </KpiGrid>
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      )}
    </SectionBlock>
  );
}

function TourismOverview({
  ilha,
  t,
  onData,
}: {
  ilha: string;
  t: DashboardDictionary;
  onData?: (data: DerivedTourismOverviewData) => void;
}) {
  const [data, setData] = useState<TourismOverviewApiResponse | null>(null);

  useEffect(() => {
    fetchJsonOfflineFirst<{
      islands?: TourismOverviewApiIsland[];
      total?: TourismOverviewApiResponse["total"];
    }>(`/api/transparencia/turismo/overview`)
      .then((res) => {
        setData(res);

        if (ilha !== ALL_ISLANDS_LABEL) {
          const row = res.islands?.find((i) => i.ilha === ilha);
          const total = res.total; // assuming national totals exist

          if (
            row &&
            total &&
            typeof row.dormidas === "number" &&
            typeof row.hospedes === "number" &&
            typeof total.dormidas === "number" &&
            typeof total.hospedes === "number"
          ) {
            onData?.({
              dormidas: row.dormidas,
              hospedes: row.hospedes,
              avgStay: row.avg_stay,
              dormidasShareNational: row.dormidas / total.dormidas,
              hospedesShareNational: row.hospedes / total.hospedes,
              domesticShare: row.domestic_share,
            });
          }
        }
      });
  }, [ilha]);

  if (!data?.islands) return null;

  const row =
    ilha === ALL_ISLANDS_LABEL ? null : data.islands.find((i) => i.ilha === ilha);

  if (ilha !== ALL_ISLANDS_LABEL && !row) return null;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-semibold">{t.tourismOverview}</h2>
      </div>

      {ilha === ALL_ISLANDS_LABEL ? (
        <p className="text-sm text-muted-foreground">
          Selecione uma ilha para visualizar indicadores agregados.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Hóspedes (ano)" value={formatNumber(row?.hospedes ?? 0)} />
          <Kpi label="Dormidas (ano)" value={formatNumber(row?.dormidas ?? 0)} />
          <Kpi
            label="Estadia média"
            value={row?.avg_stay ? `${row.avg_stay} noites` : "—"}
          />
          <Kpi
            label="Ocupação média (Q3)"
            value={row?.occupancy_rate ? `${row.occupancy_rate}%` : "—"}
          />
        </div>
      )}
    </section>
  );
}



function getPressureBand(value: number) {
  if (value < 1)
    return { label: "Baixa pressão", className: "bg-muted text-foreground" };

  if (value < 5)
    return {
      label: "moderada",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };

  if (value < 15)
    return {
      label: "elevada",
      className: "bg-red-500/10 text-red-700 dark:text-red-400",
    };

  return {
    label: "crítica",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
}
function PressurePill({ value }: { value: number }) {
  const band = getPressureBand(value);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${band.className}`}
      title="Dormidas turísticas por residente / ano"
    >
      {band.label}
    </span>
  );
}

function TourismPressure({
  ilha,
  t,
  onValue,
}: {
  ilha: string;
  t: DashboardDictionary;
  onValue?: (value: number) => void;
}) {
  const lastValueRef = useRef<number | null>(null);
  const { data, loading, error } = useDashboardQuery<{
    data?: TourismPressureApiRow[];
  }>({
    depsKey: "tourism-pressure",
    queryFn: async () =>
      fetchJsonOfflineFirst<{
        data?: TourismPressureApiRow[];
      }>(`/api/transparencia/turismo/pressure`),
  });

  const rows = (data?.data || []).filter((r) => r.ilha !== "Todas as ilhas");


  const filtered =
    ilha === ALL_ISLANDS_LABEL ? rows : rows.filter((r) => r.ilha === ilha);

  useEffect(() => {
    if (ilha === ALL_ISLANDS_LABEL) return;

    const row = rows.find((r) => r.ilha === ilha);
    if (row?.pressure_index == null) return;

    if (lastValueRef.current !== row.pressure_index) {
      lastValueRef.current = row.pressure_index;
      onValue?.(row.pressure_index);
    }
  }, [ilha, rows]);

  const ordered =
    ilha === ALL_ISLANDS_LABEL
      ? [
        ...rows.filter((r) => r.ilha === "Maio"),
        ...rows.filter((r) => r.ilha !== "Maio"),
      ]
      : filtered;


  return (
    <section className="space-y-2">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          {t.tourismPressure}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="text-muted-foreground cursor-help">
                ⓘ
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-sm">
                <p className="font-medium mb-1">
                  Índice de Pressão Turística
                </p>
                <p>
                  Relação entre dormidas turísticas e população residente.
                  Valores mais elevados indicam maior pressão sobre serviços
                  e habitação locais.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h2>

      </div>

      <DataTable
        rows={ordered.map((r) => {
          const value = r.pressure_index;

          return {
            ilha: r.ilha,
            hospedes: formatNumber(r.hospedes ?? 0),
            dormidas: formatNumber(r.dormidas ?? 0),
            população: formatNumber(r.population ?? 0),
            índice_pressão: (
              <div className="flex items-center gap-2">
                <span>{formatRatio(value)}</span>
                <PressurePill value={value ?? 0} />
              </div>
            ),

          };
        })}
        loading={loading}
        error={error}
      />


    </section>
  );
}


function getSeasonDominance(value: number) {
  if (value < 0.85)
    return {
      label: "Inverno dominante",
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    };

  if (value <= 1.15)
    return {
      label: "Neutro",
      className: "bg-muted text-foreground",
    };

  return {
    label: "Verão dominante",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  };
}

function getSeasonalityBalance(value: number) {
  if (value < 1.3)
    return {
      label: "Equilibrada",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };

  if (value < 3)
    return {
      label: "Moderadamente concentrada",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };

  return {
    label: "Desequilibrada",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
}
function SeasonalityPills({ value }: { value: number }) {
  const dominance = getSeasonDominance(value);
  const balance = getSeasonalityBalance(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${dominance.className}`}
        title="Qual estação concentra mais dormidas"
      >
        {dominance.label}
      </span>

      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${balance.className}`}
        title="Grau de concentração sazonal"
      >
        {balance.label}
      </span>
    </div>
  );
}



function SeasonalityIndex({
  ilha,
  t,
  onValue,
}: {
  ilha: string;
  t: DashboardDictionary;
  onValue?: (value: number) => void;
}) {
  const lastValueRef = useRef<number | null>(null);
  const { data, loading, error } = useDashboardQuery<{
    data?: SeasonalityApiRow[];
  }>({
    depsKey: "tourism-seasonality",
    queryFn: async () =>
      fetchJsonOfflineFirst<{
        data?: SeasonalityApiRow[];
      }>(`/api/transparencia/turismo/seasonality`),
  });
  const rows = data?.data || [];

  const ordered =
    ilha === ALL_ISLANDS_LABEL
      ? [
        ...rows.filter((r) => r.ilha === "Maio"),
        ...rows.filter((r) => r.ilha !== "Maio"),
      ]
      : rows.filter((r) => r.ilha === ilha);

  useEffect(() => {
    if (ilha === ALL_ISLANDS_LABEL) return;

    const row = rows.find((r) => r.ilha === ilha);
    if (row?.seasonality_index == null) return;

    if (lastValueRef.current !== row.seasonality_index) {
      lastValueRef.current = row.seasonality_index;
      onValue?.(row.seasonality_index);
    }
  }, [ilha, rows]);


  return (
    <section className="space-y-2">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          {t.seasonality}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="text-muted-foreground cursor-help">
                ⓘ
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-sm">
                <p className="font-medium mb-1">
                  Contraste Sazonal (Q3 / Q1)
                </p>
                <p>
                  Mede quantas vezes o verão é mais ativo do que o inverno em
                  termos de dormidas turísticas. Valores elevados indicam forte
                  concentração da atividade no verão. Valores próximos de 1
                  indicam uma distribuição mais equilibrada ao longo do ano.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h2>

      </div>
      <DataTable
        rows={ordered.map((r) => {
          const value = r.seasonality_index;

          return {
            ilha: r.ilha,
            dormidas_Q1: formatNumber(r.q1_dormidas ?? 0),
            dormidas_Q3: formatNumber(r.q3_dormidas ?? 0),
            índice_sazonalidade: (
              <div className="flex items-center gap-2">
                <span>{formatRatio(value)}</span>
                <SeasonalityPills value={value ?? 0} />
              </div>
            ),
          };
        })}
        loading={loading}
        error={error}
      />


    </section>
  );
}












/* =========================
   Page
========================= */

export default function TourismPage() {
  const [locale] = useState<Locale>("pt");
  const t = dictionary[locale];

  const [ilha, setIlha] = useState("Maio");
  const [year, setYear] = useState("2025");
  const [open, setOpen] = useState(false);

  const [populationData, setPopulationData] = useState<DerivedPopulationData>({});
  const [derivedMetrics, setDerivedMetrics] = useState<DerivedMetricsData>({});
  const [tourismOverviewData, setTourismOverviewData] =
    useState<DerivedTourismOverviewData>({});
  const [receitasData, setReceitasData] = useState<DerivedReceitasData>({});
  const capabilities = YEAR_CAPABILITIES[year] || YEAR_CAPABILITIES["2025"];

  const tldr = useMemo(
    () =>
      buildIslandTldr({
        islandName: ilha,
        population: populationData.population,
        populationShareNational: populationData.populationShareNational,
        tourismPressure: derivedMetrics.tourismPressure,
        seasonality: derivedMetrics.seasonality,
        dormidasShareNational: tourismOverviewData.dormidasShareNational,
        hospedesShareNational: tourismOverviewData.hospedesShareNational,
        avgStay: tourismOverviewData.avgStay,
        domesticShare: tourismOverviewData.domesticShare,
        receitasYear: receitasData.year,
        receitasIsland: receitasData.island,
        receitasIslandLabel: receitasData.islandLabel,
        receitasNationalTotal: receitasData.total,
        receitasShareNational: receitasData.shareNational,
      }),
    [ilha, populationData, derivedMetrics, tourismOverviewData, receitasData]
  );

  const { sections, globalVerdict } = tldr;

  const { data: baseline2024, loading: baselineLoading } =
    useTourismBaseline2024();


  const islandsByHospedes =
    baseline2024?.islands
      ?.slice()
      .sort((a: TourismBaselineIsland, b: TourismBaselineIsland) => b.hospedes - a.hospedes) ?? []

  const topIsland = islandsByHospedes[0]
  const bottomIsland = islandsByHospedes[islandsByHospedes.length - 1]

  const totalHospedes = baseline2024?.national?.hospedes ?? 0;

  const topIslandShare =
    topIsland && totalHospedes > 0
      ? (topIsland.hospedes / totalHospedes) * 100
      : null;

  const bottomIslandShare =
    bottomIsland && totalHospedes > 0
      ? (bottomIsland.hospedes / totalHospedes) * 100
      : null;


  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Watermark */}
      <div
        className="absolute inset-0 z-0 bg-center bg-no-repeat opacity-[0.04] dark:opacity-[0.035]"
        style={{
          backgroundImage: "url('/maioazul.png')",
          backgroundSize: "300px",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-2 pb-16 space-y-6">
        {/* Header */}
        <div className="border-b border-border">
          <div className="pt-6 pb-6 space-y-2">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-xl font-semibold">{t.title}</h1>
                <p className="text-sm text-muted-foreground">{t.subtitle}</p>
              </div>

              <div className="flex items-center gap-3">
                {ilha !== ALL_ISLANDS_LABEL && capabilities.hasInsights && (
                  <button
                    onClick={() => setOpen(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </button>
                )}
                <ThemeToggle />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <Select value={ilha} onValueChange={setIlha}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISLANDS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* =========================
            YEAR = 2024 · BASELINE
        ========================= */}

        {ilha === "Maio" && (
          <MaioPopulationSnapshot
            t={t}
            onData={(data) =>
              setPopulationData({
                population: data.total_population,
                populationShareNational: data.population_share_national,
              })
            }
          />
        )}

        <ReceitasSection ilha={ilha} year={year} onData={setReceitasData} />

        {ilha === ALL_ISLANDS_LABEL &&
          (capabilities.hasBaseline2024 || capabilities.hasLiveTourism) && (
          <>
            <AllIslandsTourismTotals year={year} />
            {capabilities.note && <CoverageNote note={capabilities.note} />}
          </>
        )}

        {ilha === "Maio" && capabilities.hasLocalGovernment && (
          <LocalGovernmentOverview t={t} year={year} />
        )}



        {capabilities.hasBaseline2024 && (
          <>
            {ilha === ALL_ISLANDS_LABEL && (
              <HospedesDormidasStackedChart year={year} />
            )}

            {ilha !== ALL_ISLANDS_LABEL && (
              <TourismIslandBaseline ilha={ilha} />
            )}






          </>
        )}


        {capabilities.hasBaseline2024 &&
          ilha === ALL_ISLANDS_LABEL &&
          baseline2024 &&
          baseline2024.national &&
          baseline2024.islands && (
          <>


            {/* ISLAND COMPARISON */}
            <section className="space-y-2">
              <h2 className="font-semibold">Distribuição por ilha (2024)</h2>
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi
                  label="Hóspedes"
                  value={formatNumber(baseline2024.national.hospedes ?? 0)}
                />
                <Kpi
                  label="Dormidas"
                  value={formatNumber(baseline2024.national.dormidas ?? 0)}
                />

                {topIsland && topIslandShare != null && (
                  <Kpi
                    label="Ilha líder em hóspedes"
                    value={`${topIsland.ilha} · ${topIslandShare.toFixed(1)}%`}
                  />
                )}

                {bottomIsland && bottomIslandShare != null && (
                  <Kpi
                    label="Menor volume de hóspedes"
                    value={`${bottomIsland.ilha} · ${bottomIslandShare.toFixed(2)}%`}
                  />
                )}

              </section>

                <DataTable
                rows={baseline2024.islands
                  .slice()
                    .sort((a: TourismBaselineIsland, b: TourismBaselineIsland) => b.dormidas - a.dormidas)
                    .map((i: TourismBaselineIsland) => ({
                      ilha: i.ilha,
                      hóspedes: formatNumber(i.hospedes),
                      dormidas: formatNumber(i.dormidas),
                    estadia_média: i.avg_stay.toFixed(2),
                  }))}
              />
            </section>

            <TourismStructuralBaseline />


          </>
        )}





        {/* =========================
            YEAR = 2025 · LIVE
        ========================= */}
        {capabilities.hasLiveTourism && (
          <>

            {ilha === ALL_ISLANDS_LABEL && (
              <>


                <HospedesDormidasStackedChart year={year} />
                <TourismPressure
                  ilha={ilha}
                  t={t}
                  onValue={(value) =>
                    setDerivedMetrics((m) => ({
                      ...m,
                      tourismPressure: value,
                    }))
                  }
                />
                <TourismHotelsTable />




                <SeasonalityIndex
                  ilha={ilha}
                  t={t}
                  onValue={(value) =>
                    setDerivedMetrics((m) => ({
                      ...m,
                      seasonality: value,
                    }))
                  }
                />


              </>
            )}

            {ilha !== ALL_ISLANDS_LABEL && (
              <>
                <IslandPopulationSnapshot
                  ilha={ilha}
                  onData={setPopulationData}
                />

                <TourismOverview
                  ilha={ilha}
                  t={t}
                  onData={setTourismOverviewData}
                />

                <TourismAccommodationTable ilha={ilha} />
                {/* <TourismStructuralBaseline /> */}

                <TourismPressure
                  ilha={ilha}
                  t={t}
                  onValue={(v) =>
                    setDerivedMetrics((m) => ({
                      ...m,
                      tourismPressure: v,
                    }))
                  }
                />

                <SeasonalityIndex
                  ilha={ilha}
                  t={t}
                  onValue={(v) =>
                    setDerivedMetrics((m) => ({
                      ...m,
                      seasonality: v,
                    }))
                  }
                />

                <CountryDependency ilha={ilha} year={year} t={t} />

                {capabilities.hasInsights && (
                  <TldrDrawer
                    open={open}
                    onOpenChange={setOpen}
                    title="Estado atual da ilha"
                    sections={sections}
                    globalVerdict={globalVerdict}
                  />
                )}
              </>
            )}
          </>
        )}

        {(capabilities.hasBaseline2024 || capabilities.hasLiveTourism) && (
          <BaselineNote />
        )}
      </div>
    </div>
  );
}

/* =========================
   Baseline Context Note
========================= */

function BaselineNote() {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
      <strong>Nota metodológica:</strong> Os dados de 2024 representam uma
      fotografia estrutural anual. Indicadores de pressão turística,
      sazonalidade e impacto populacional requerem séries temporais completas e
      estão disponíveis a partir de 2025.
    </div>
  );
}

function CoverageNote({ note }: { note: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
      <strong>Cobertura do ano:</strong> {note}
    </div>
  );
}

function DataTable({
  rows,
  loading,
  error,
}: {
  rows: DataTableRow[];
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, rowIdx) => (
              <TableRow key={rowIdx}>
                {Array.from({ length: 4 }).map((__, cellIdx) => (
                  <TableCell key={cellIdx}>
                    <Skeleton className="h-4 w-full max-w-[180px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-muted-foreground">
        Falha ao carregar dados.
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-sm text-muted-foreground">
        Sem dados para os filtros atuais.
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((k) => (
              <TableHead key={k}>{k}</TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((key) => {
                const cell = row[key];
                if (isDataTableObjectCell(cell)) {
                  return (
                    <TableCell
                      key={key}
                      className={cell.className}
                    >
                      {cell.value}
                    </TableCell>
                  );
                }
                return (
                  <TableCell key={key}>
                    {cell}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
