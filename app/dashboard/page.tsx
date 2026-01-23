"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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



import { ThemeToggle } from "@/components/theme-toggle";
import { dictionary, type Locale } from "@/lib/i18n";

import { buildIslandTldr } from "@/lib/tldr";
import { TldrDrawer } from "@/components/TldrDrawer";

import { ChartSection } from "@/components/dashboard/ChartSection";
import { TourismScaleChart } from "@/components/dashboard/TourismScaleChart";

import { Sparkles } from "lucide-react";

/* =========================
   Utils
========================= */

const formatNumber = (v: number) =>
  new Intl.NumberFormat("pt-PT").format(v);

const formatRatio = (v: unknown) => {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toFixed(2);
};

const formatCVE = (value: number) =>
  new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0,
  }).format(value) + " CVE";

// const ISLANDS = ["Todas", "Maio"];
const ISLANDS = ["Todas", "Maio", "Sal", "Boa Vista"];

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
    if (ilha === "Todas") return;

    fetch(`/api/transparencia/turismo/population?year=2025`)
      .then((r) => r.json())
      .then((res) => {
        const row = res.data?.find(
          (r: any) => r.ilha.toLowerCase() === ilha.toLowerCase()
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


/* =========================
   Color helpers (NEW)
========================= */

const pressureClass = (v: number) =>
  v < 1 ? "text-emerald-600"
    : v < 3 ? "text-amber-600"
      : "text-rose-600";

const seasonalityClass = (v: number) =>
  v < 1.5 ? "text-emerald-600"
    : v < 3 ? "text-amber-600"
      : "text-rose-600";

const dependencyClass = (pct: number) =>
  pct < 20 ? "text-emerald-600"
    : pct < 40 ? "text-amber-600"
      : "text-rose-600";


function describeTourismPressure(v: number) {
  if (v < 1) return "Turismo marginal face à população";
  if (v < 5) return "Turismo presente mas integrado";
  if (v < 15) return "Turismo domina o ritmo local";
  return "Forte pressão turística";
}


function describeSeasonality(v: number) {
  if (v < 1) return "Inverno mais ativo que o verão";
  if (v < 3) return "Atividade distribuída ao longo do ano";
  if (v < 8) return "Verão domina a atividade turística";
  if (v < 20) return "Economia turística concentrada no verão";
  return "Dependência extrema do verão";
}

const YEARS = ["2025"];




/* =========================
   Page
========================= */

export default function TourismPage() {

  const [locale, setLocale] = useState<Locale>("pt");
  const t = dictionary[locale];

  const [ilha, setIlha] = useState("Maio");
  const [year, setYear] = useState("2025");

  const [open, setOpen] = useState(false);

  const [populationData, setPopulationData] = useState<{
    population?: number;
    populationShareNational?: number;
  }>({});


  const [derivedMetrics, setDerivedMetrics] = useState<{
    tourismPressure?: number;
    seasonality?: number;
  }>({});

  const [tourismOverviewData, setTourismOverviewData] = useState<{
    dormidas?: number;
    hospedes?: number;
    avgStay?: number;
    dormidasShareNational?: number;
    hospedesShareNational?: number;
    domesticShare?: number;
  }>({});



  const tldr = useMemo(() => {
    return buildIslandTldr({
      population: populationData.population,
      populationShareNational: populationData.populationShareNational,

      tourismPressure: derivedMetrics.tourismPressure,
      seasonality: derivedMetrics.seasonality,

      dormidasShareNational: tourismOverviewData.dormidasShareNational,
      hospedesShareNational: tourismOverviewData.hospedesShareNational,
      avgStay: tourismOverviewData.avgStay,
      domesticShare: tourismOverviewData.domesticShare,
    });
  }, [
    populationData,
    derivedMetrics,
    tourismOverviewData,
  ]);



  const { sections, globalVerdict } = tldr;


  return (
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-16 space-y-8 bg-background text-foreground">
      {/* Header */}
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className=" pt-6 pb-6 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">{t.title}</h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>

            <div className="flex items-center gap-3">

              {ilha !== "Todas" && (
                <button
                  onClick={() => setOpen(true)}
                  aria-label="Leitura rápida"
                  title="Leitura rápida"
                  className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground transition"

                >
                  <Sparkles className="h-4 w-4 text-amber-500 hover:text-amber-600" />
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



      {/* ALL ISLANDS VIEW */}
      {ilha === "Todas" && (
        <>
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



      {/* SINGLE ISLAND VIEW */}
      {ilha !== "Todas" && (


        <>
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


          {/* Population snapshot · only Maio */}
          {ilha !== "Todas" && (
            <IslandPopulationSnapshot
              ilha={ilha}
              onData={(data) => setPopulationData(data)}
            />
          )}



          {/* Governo local · apenas Maio */}
          {ilha === "Maio" && <LocalGovernmentOverview t={t} />}

          <TourismOverview
            ilha={ilha}
            t={t}
            onData={(data) => setTourismOverviewData(data)}
          />

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

          <CountryDependency ilha={ilha} t={t} />
          {ilha !== "Todas" && (
            <TldrDrawer
              open={open}
              onOpenChange={setOpen}
              title="Estado atual da ilha"
              sections={sections}
              globalVerdict={globalVerdict}
            />
          )}





          {/* Estrutura social · apenas Maio */}
          {/* {ilha === "Maio" && <MaioCoreMetrics t={t} />} */}
        </>
      )}
      <div className="text-xs text-muted-foreground">

        Dados: portaltransparencia.gov.cv · INE Cabo Verde<br />
        Versão 1.0  · maioazul.com
      </div>

    </div>
  );
}


/* =========================
   Maio · Population Snapshot (TOP KPIs)
========================= */

/* =========================
   Maio · Population Snapshot (TOP KPIs)
========================= */

function MaioPopulationSnapshot({
  t,
  onData,
}: {
  t: any;
  onData?: (data: Record<string, number>) => void;
}) {
  const [data, setData] = useState<Record<string, number> | null>(null);

  const METRICS = t.maioCoreMetrics.metrics;

  useEffect(() => {
    fetch("/api/transparencia/municipal/maio/core-metrics?year=2025")
      .then((r) => r.json())
      .then((res) => {
        const map: Record<string, number> = {};

        (res.data || []).forEach((r: any) => {
          if (r.breakdown === null) {
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
    <section className="space-y-4">

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

/* =========================
   Governo Local
========================= */

function LocalGovernmentOverview({ t }: { t: any }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const MAIO_POPULATION = 6411;

  useEffect(() => {
    fetch(
      `/api/transparencia/municipal/transferencias?municipio=CMMAIO&year=2025`
    )
      .then((r) => r.json())
      .then((res) => {
        setData(res.data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  const months = data
    .map((r: any) => ({
      month: Number(r.month),
      valor: Number(r.valor_pago || 0),
    }))
    .filter((r: any) => r.month >= 1 && r.month <= 12);

  const totalYear = months.reduce((s, r) => s + r.valor, 0);
  const lastMonth =
    months.length > 0
      ? months.sort((a, b) => b.month - a.month)[0]
      : null;
  const avgMonthly = months.length > 0 ? totalYear / months.length : 0;
  const perCitizen = totalYear / MAIO_POPULATION;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">{t.localGovernment}</h2>
        <p className="text-sm text-muted-foreground">
          {t.localGovernmentDesc}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Mais Recente"
          value={lastMonth ? formatCVE(lastMonth.valor) : "—"}
        />
        <Kpi label="Total anual" value={formatCVE(totalYear)} />
        <Kpi label="Média mensal" value={formatCVE(avgMonthly)} />
        <Kpi label="Por residente" value={formatCVE(perCitizen)} />
      </div>
    </section>
  );
}

/* =========================
   Turismo · Visão Geral
========================= */

function TourismOverview({
  ilha,
  t,
  onData,
}: {
  ilha: string;
  t: any;
  onData?: (data: any) => void;
}) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/transparencia/turismo/overview`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);

        if (ilha !== "Todas") {
          const row = res.islands?.find((i: any) => i.ilha === ilha);
          const total = res.total; // assuming national totals exist

          if (row && total) {
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
    ilha === "Todas" ? null : data.islands.find((i: any) => i.ilha === ilha);

  if (ilha !== "Todas" && !row) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">{t.tourismOverview}</h2>
      </div>

      {ilha === "Todas" ? (
        <p className="text-sm text-muted-foreground">
          Selecione uma ilha para visualizar indicadores agregados.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Hóspedes (ano)" value={formatNumber(row.hospedes)} />
          <Kpi label="Dormidas (ano)" value={formatNumber(row.dormidas)} />
          <Kpi
            label="Estadia média"
            value={row.avg_stay ? `${row.avg_stay} noites` : "—"}
          />
          <Kpi
            label="Ocupação média (Q3)"
            value={row.occupancy_rate ? `${row.occupancy_rate}%` : "—"}
          />
        </div>
      )}
    </section>
  );
}

/* =========================
   KPI
========================= */

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

/* =========================
   Pressão Turística
========================= */

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
  t: any;
  onValue?: (value: number) => void;
}) {

  const [rows, setRows] = useState<any[]>([]);
  const lastValueRef = useRef<number | null>(null);

  useEffect(() => {
    fetch(`/api/transparencia/turismo/pressure`)
      .then((r) => r.json())
      .then((res) => {
        const clean = (res.data || []).filter(
          (r: any) => r.ilha !== "Todas as ilhas"
        );
        setRows(clean);
      });
  }, []);


  const filtered =
    ilha === "Todas" ? rows : rows.filter((r) => r.ilha === ilha);

  useEffect(() => {
    if (ilha === "Todas") return;

    const row = rows.find((r) => r.ilha === ilha);
    if (row?.pressure_index == null) return;

    if (lastValueRef.current !== row.pressure_index) {
      lastValueRef.current = row.pressure_index;
      onValue?.(row.pressure_index);
    }
  }, [ilha, rows]);

  return (
    <section className="space-y-4">
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
        rows={filtered.map((r) => {
          const value = r.pressure_index;

          return {
            ilha: r.ilha,
            dormidas: formatNumber(r.dormidas),
            população: formatNumber(r.population),
            índice_pressão: (
              <div className="flex items-center gap-2">
                <span>{formatRatio(value)}</span>
                <PressurePill value={value} />
              </div>
            ),
          };
        })}
      />

    </section>
  );
}

/* =========================
   Sazonalidade
========================= */

function getSeasonalityBand(value: number) {
  if (value < 1)
    return {
      label: "Inverno dominante",
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    };

  if (value < 3)
    return {
      label: "Baixa",
      className: "bg-muted text-foreground",
    };

  if (value < 8)
    return {
      label: "elevada",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };

  if (value < 20)
    return {
      label: "muito elevada",
      className: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    };

  return {
    label: "extrema",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
}


function SeasonalityPill({ value }: { value: number }) {
  const band = getSeasonalityBand(value);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${band.className}`}
      title="Dormidas Q3 ÷ Dormidas Q1"
    >
      {band.label}
    </span>
  );
}


function SeasonalityIndex({
  ilha,
  t,
  onValue,
}: {
  ilha: string;
  t: any;
  onValue?: (value: number) => void;
}) {

  const [rows, setRows] = useState<any[]>([]);
  const lastValueRef = useRef<number | null>(null);

  useEffect(() => {
    fetch(`/api/transparencia/turismo/seasonality`)
      .then((r) => r.json())
      .then((res) => setRows(res.data || []));
  }, []);

  const filtered =
    ilha === "Todas" ? rows : rows.filter((r) => r.ilha === ilha);

  useEffect(() => {
    if (ilha === "Todas") return;

    const row = rows.find((r) => r.ilha === ilha);
    if (row?.seasonality_index == null) return;

    if (lastValueRef.current !== row.seasonality_index) {
      lastValueRef.current = row.seasonality_index;
      onValue?.(row.seasonality_index);
    }
  }, [ilha, rows]);


  return (
    <section className="space-y-4">
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
        rows={filtered.map((r) => {
          const value = r.seasonality_index;

          return {
            ilha: r.ilha,
            dormidas_Q1: formatNumber(r.q1_dormidas),
            dormidas_Q3: formatNumber(r.q3_dormidas),
            índice_sazonalidade: (
              <div className="flex items-center gap-2">
                <span>{formatRatio(value)}</span>
                <SeasonalityPill value={value} />
              </div>
            ),
          };
        })}
      />

    </section>
  );
}

/* =========================
   Dependência por País
========================= */

function CountryDependency({ ilha, t }: { ilha: string; t: any }) {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (ilha === "Todas") return;

    fetch(`/api/transparencia/turismo/dependency?ilha=${ilha}`)
      .then((r) => r.json())
      .then((res) => {
        const d = res.data?.[0]?.countries || [];
        setRows(
          d
            .sort((a: any, b: any) => b.share - a.share)
            .map((c: any) => ({
              país: c.pais,
              hóspedes: formatNumber(c.hospedes),
              percentagem: `${(c.share * 100).toFixed(1)}%`,
            }))
        );
      });
  }, [ilha]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">{t.dependency}</h2>
      </div>

      {ilha === "Todas" ? (
        <p className="text-sm text-muted-foreground">
          Selecione uma ilha para ver o detalhe por país.
        </p>
      ) : (
        <DataTable rows={rows} />
      )}
    </section>
  );
}

/* =========================
   Maio · Indicadores Estruturais
========================= */

function MaioCoreMetrics({ t }: { t: any }) {
  const [rows, setRows] = useState<any[]>([]);

  const METRICS = t.maioCoreMetrics.metrics as Record<
    string,
    {
      label: string;
      description: string;
      format: "number" | "percent";
      order: number;
    }
  >;

  useEffect(() => {
    fetch("/api/transparencia/municipal/maio/core-metrics?year=2025")
      .then((r) => r.json())
      .then((res) => {
        const out: any[] = [];

        (res.data || []).forEach((r: any) => {
          if (METRICS[r.metric] && r.breakdown === null) {
            out.push({ key: r.metric, value: r.value });
          }
        });

        setRows(
          out
            .map(({ key, value }) => {
              const meta = METRICS[key];
              return {
                indicador: meta.label,
                valor:
                  meta.format === "percent"
                    ? `${value}%`
                    : formatNumber(value),
                descrição: meta.description,
                _order: meta.order,
              };
            })
            .sort((a, b) => a._order - b._order)
            .map(({ _order, ...r }) => r)
        );
      });
  }, [METRICS]);

  if (!rows.length) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">
          {t.maioCoreMetrics.title}
        </h2>

      </div>

      <DataTable rows={rows} />
    </section>
  );
}

/* =========================
   Shared Table
========================= */

function DataTable({ rows }: { rows: any[] }) {
  if (!rows.length) {
    return (
      <div className="text-sm text-muted-foreground">
        Sem dados
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
                if (
                  typeof cell === "object" &&
                  cell?.value !== undefined
                ) {
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
