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

import { Sparkles } from "lucide-react";

import { TourismAccommodationTable } from "@/components/TourismAccommodationTable";
import { TourismStructuralBaseline } from "@/components/TourismStructuralBaseline";
import { TourismIslandBaseline } from "@/components/TourismIslandBaseline";

import { HospedesDormidasStackedChart } from "@/components/dashboard/HospedesDormidasStackedChart";
import { ChartSection } from "@/components/dashboard/ChartSection";

import { useTourismBaseline2024 } from "@/lib/hooks/useTourismBaseline2024";


/* =========================
   Constants & Utils
========================= */

const ISLANDS = ["Todas", "Maio"];
const YEARS = ["2025", "2024"];

const formatNumber = (v: number) =>
  new Intl.NumberFormat("pt-PT").format(v);

const formatRatio = (v: unknown) =>
  typeof v === "number" && !Number.isNaN(v) ? v.toFixed(2) : "—";

const formatCVE = (value: number) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(value) +
  " CVE";




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






function CountryDependency({
  ilha,
  year,
  t,
}: {
  ilha: string;
  year: string;
  t: any;
}) {

  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (ilha === "Todas") return;

    fetch(
      `/api/transparencia/turismo/dependency?ilha=${ilha}&year=${year}`
    )
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
  }, [ilha, year]);

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


function TourismHotelsTable({
  highlightIsland,
}: {
  highlightIsland?: string;
}) {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/transparencia/turismo/hoteis")
      .then((r) => r.json())
      .then((res) => {
        const data =
          res.islands?.map((i: any) => ({
            ilha: i.ilha,
            estabelecimentos: formatNumber(i.totals.establishments),
            trabalhadores: formatNumber(i.totals.staff),
            trabalhadores_por_estabelecimento: i.totals.staff_per_establishment
              ? i.totals.staff_per_establishment.toFixed(2)
              : "—",
            _highlight: i.ilha === highlightIsland,
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
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
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

  const ordered =
    ilha === "Todas"
      ? [
        ...rows.filter((r) => r.ilha === "Maio"),
        ...rows.filter((r) => r.ilha !== "Maio"),
      ]
      : filtered;


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
        rows={ordered.map((r) => {
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

  const ordered =
    ilha === "Todas"
      ? [
        ...rows.filter((r) => r.ilha === "Maio"),
        ...rows.filter((r) => r.ilha !== "Maio"),
      ]
      : rows.filter((r) => r.ilha === ilha);

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
        rows={ordered.map((r) => {
          const value = r.seasonality_index;

          return {
            ilha: r.ilha,
            dormidas_Q1: formatNumber(r.q1_dormidas),
            dormidas_Q3: formatNumber(r.q3_dormidas),
            índice_sazonalidade: (
              <div className="flex items-center gap-2">
                <span>{formatRatio(value)}</span>
                <SeasonalityPills value={value} />
              </div>
            ),
          };
        })}
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

  const [populationData, setPopulationData] = useState<any>({});
  const [derivedMetrics, setDerivedMetrics] = useState<any>({});
  const [tourismOverviewData, setTourismOverviewData] = useState<any>({});

  const tldr = useMemo(
    () =>
      buildIslandTldr({
        population: populationData.population,
        populationShareNational: populationData.populationShareNational,
        tourismPressure: derivedMetrics.tourismPressure,
        seasonality: derivedMetrics.seasonality,
        dormidasShareNational: tourismOverviewData.dormidasShareNational,
        hospedesShareNational: tourismOverviewData.hospedesShareNational,
        avgStay: tourismOverviewData.avgStay,
        domesticShare: tourismOverviewData.domesticShare,
      }),
    [populationData, derivedMetrics, tourismOverviewData]
  );

  const { sections, globalVerdict } = tldr;

  const { data: baseline2024, loading: baselineLoading } =
    useTourismBaseline2024();


  const islandsByHospedes =
    baseline2024?.islands
      ?.slice()
      .sort((a: any, b: any) => b.hospedes - a.hospedes) ?? []

  const topIsland = islandsByHospedes[0]
  const bottomIsland = islandsByHospedes[islandsByHospedes.length - 1]



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

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-2 pb-16 space-y-8">
        {/* Header */}
        <div className="border-b border-border">
          <div className="pt-6 pb-6 space-y-4">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-xl font-semibold">{t.title}</h1>
                <p className="text-sm text-muted-foreground">{t.subtitle}</p>
              </div>

              <div className="flex items-center gap-3">
                {ilha !== "Todas" && year === "2025" && (
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



        {year === "2024" && (
          <>
            {ilha === "Todas" && (
              <HospedesDormidasStackedChart year={year} />
            )}

            {ilha !== "Todas" && (
              <TourismIslandBaseline ilha={ilha} />
            )}






          </>
        )}


        {year === "2024" && ilha === "Todas" && baseline2024 && (
          <>


            {/* ISLAND COMPARISON */}
            <section className="space-y-4">
              <h2 className="font-semibold">Distribuição por ilha (2024)</h2>
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi
                  label="Hóspedes (2024)"
                  value={formatNumber(baseline2024.national.hospedes)}
                />
                <Kpi
                  label="Dormidas (2024)"
                  value={formatNumber(baseline2024.national.dormidas)}
                />

                {topIsland && (
                  <Kpi
                    label="Ilha líder em hóspedes"
                    value={`${topIsland.ilha} · ${formatNumber(topIsland.hospedes)}`}
                  />
                )}

                {bottomIsland && (
                  <Kpi
                    label="Menor volume de hóspedes"
                    value={`${bottomIsland.ilha} · ${formatNumber(bottomIsland.hospedes)}`}
                  />
                )}
              </section>

              <DataTable
                rows={baseline2024.islands
                  .sort((a: any, b: any) => b.dormidas - a.dormidas)
                  .map((i: any) => ({
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
        {year === "2025" && (
          <>

            {/* Governo local · apenas Maio */}
            {ilha === "Maio" && <LocalGovernmentOverview t={t} />}
            {ilha === "Todas" && (
              <>
                <HospedesDormidasStackedChart year={year} />
                <TourismHotelsTable />

                <TourismPressure
                  ilha={ilha}
                  t={t}
                  onValue={(value) =>
                    setDerivedMetrics((m: any) => ({
                      ...m,
                      tourismPressure: value,
                    }))
                  }
                />


                        <SeasonalityIndex
                            ilha={ilha}
                            t={t}
                            onValue={(value) =>
                                setDerivedMetrics((m:any) => ({
                                    ...m,
                                    seasonality: value,
                                }))
                            }
                        />


              </>
            )}

            {ilha !== "Todas" && (
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
                    setDerivedMetrics((m: any) => ({
                      ...m,
                      tourismPressure: v,
                    }))
                  }
                />

                <SeasonalityIndex
                  ilha={ilha}
                  t={t}
                  onValue={(v) =>
                    setDerivedMetrics((m: any) => ({
                      ...m,
                      seasonality: v,
                    }))
                  }
                />

                <CountryDependency ilha={ilha} year={year} t={t} />

                <TldrDrawer
                  open={open}
                  onOpenChange={setOpen}
                  title="Estado atual da ilha"
                  sections={sections}
                  globalVerdict={globalVerdict}
                />
              </>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground">
          Dados: portaltransparencia.gov.cv · INE Cabo Verde
          <br />
          Versão 1.0 · maioazul.com
        </div>
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
