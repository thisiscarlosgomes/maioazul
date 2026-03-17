"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionBlock } from "@/components/dashboard/SectionBlock";
import { KpiGrid, KpiStat } from "@/components/dashboard/KpiStat";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useDashboardQuery } from "@/lib/hooks/useDashboardQuery";
import { fetchJsonOfflineFirst } from "@/lib/offline";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

type AnnualSeries = Record<string, number>;

type QuarterlySeries = {
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
};

type ExternalSectorSeriesRow = {
  name: string;
  annual: AnnualSeries;
  monthly_2025?: Record<string, number>;
};

type ExternalSectorIdeRow = {
  name: string;
  annual: AnnualSeries;
  quarterly_2025?: QuarterlySeries;
  destination_breakdown_annual?: Record<string, Record<string, number>>;
  destination_breakdown_by_island?: Record<string, AnnualSeries>;
};

type IdeSectorNode = {
  sector: string;
  annual: AnnualSeries;
  children?: IdeSectorNode[];
};

type IdeSectorByDestination = {
  island: string;
  sectors: IdeSectorNode[];
};

type ExternalSectorDataset = {
  source?: {
    publisher?: string;
    title?: string;
    unit?: string;
    note?: string;
  };
  remessasEmigrantes?: {
    totals?: {
      annual?: AnnualSeries;
      monthly_2025?: Record<string, number>;
    };
    paises_origem_annual?: ExternalSectorSeriesRow[];
    destino_concelhos_annual?: ExternalSectorSeriesRow[];
    monthly_by_destination_2025?: Record<string, Record<string, number>>;
  };
  ideCaboVerde?: {
    totals?: {
      annual?: AnnualSeries;
      quarterly_2025?: QuarterlySeries;
    };
    by_country?: ExternalSectorIdeRow[];
    by_destination_island?: ExternalSectorIdeRow[];
    sector_by_destination?: IdeSectorByDestination[];
  };
};

type PaymentYear = "2019" | "2020" | "2021" | "2022" | "2023";
type PaymentValues = Partial<Record<PaymentYear, number | null>>;

type PaymentSystemRow = {
  name: string;
  values: PaymentValues;
};

type PaymentSystemDataset = {
  source?: {
    title?: string;
    publisher?: string;
    unit?: string;
    note?: string;
  };
  years?: string[];
  banking_structure_by_island?: PaymentSystemRow[];
  atm_terminals_by_island?: PaymentSystemRow[];
  pos_terminals_by_island?: PaymentSystemRow[];
  atm_population_coverage_by_municipality?: PaymentSystemRow[];
};

const YEARS = ["2025", "2024", "2023"];
const PAYMENT_YEARS: PaymentYear[] = ["2019", "2020", "2021", "2022", "2023"];
const ALL_ISLANDS_LABEL = "Todas as Ilhas";
const ISLANDS = [ALL_ISLANDS_LABEL, "Maio"];
const SHOW_MONTHLY_REMESSAS_TABLE = false;
const DASHBOARD_CHART_COLORS = {
  primary: "#1E78FF",
  secondary: "#FBBF24",
  tertiary: "#14B8A6",
};
const MONTH_ORDER = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const formatOneDecimal = (v: number) =>
  new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v);

const formatMillionsEscudos = (value: number) => `${formatOneDecimal(value)} M CVE`;

const formatDeltaPercent = (value: number | null) =>
  value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const normalizeLabel = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const formatInteger = (value: number) => new Intl.NumberFormat("pt-PT").format(value);

function FinanceTable({
  rows,
}: {
  rows: Array<Record<string, string>>;
}) {
  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">Sem dados.</div>;
  }

  const keys = Object.keys(rows[0]);
  const preferredFirst = [
    "ilha",
    "município",
    "municipio",
    "origem",
    "país",
    "pais",
    "destino",
    "setor",
    "mês",
    "mes",
  ];
  const preferredColumns = preferredFirst.filter((column) => keys.includes(column));
  const columns = [
    ...preferredColumns,
    ...keys.filter((column) => !preferredColumns.includes(column)),
  ];

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              {columns.map((column) => (
                <TableCell key={column}>{row[column]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RemessasBarChart({
  title,
  description,
  data,
  xKey,
}: {
  title: string;
  description: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
}) {
  if (!data.length) {
    return (
      <SectionBlock title={title} description={description}>
        <div className="text-sm text-muted-foreground">Sem dados.</div>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock title={title} description={description}>
      <ChartContainer
        config={{
          valor: {
            label: "Remessas",
            color: DASHBOARD_CHART_COLORS.primary,
          },
        }}
        className="h-[280px] w-full"
      >
        <BarChart data={data} accessibilityLayer margin={{ left: 8, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={72} />
          <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
          <Bar dataKey="valor" fill="var(--color-valor)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </SectionBlock>
  );
}

function RemessasByCountryGroupedBarChart({
  title,
  description,
  data,
  embedded = false,
}: {
  title: string;
  description: string;
  data: Array<{ origem: string; y2023: number; y2024: number; y2025: number }>;
  embedded?: boolean;
}) {
  if (!data.length) {
    if (embedded) {
      return <div className="text-sm text-muted-foreground">Sem dados.</div>;
    }
    return (
      <SectionBlock title={title} description={description}>
        <div className="text-sm text-muted-foreground">Sem dados.</div>
      </SectionBlock>
    );
  }

  const chart = (
    <ChartContainer
      config={{
        y2023: {
          label: "2023",
          color: DASHBOARD_CHART_COLORS.primary,
        },
        y2024: {
          label: "2024",
          color: DASHBOARD_CHART_COLORS.secondary,
        },
        y2025: {
          label: "2025",
          color: DASHBOARD_CHART_COLORS.tertiary,
        },
      }}
      className="h-[460px] w-full"
    >
      <BarChart
        data={data}
        layout="vertical"
        accessibilityLayer
        margin={{ left: 16, right: 16 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis
          dataKey="origem"
          type="category"
          tickLine={false}
          axisLine={false}
          width={170}
        />
        <Legend />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar dataKey="y2023" fill="var(--color-y2023)" radius={[0, 3, 3, 0]} />
        <Bar dataKey="y2024" fill="var(--color-y2024)" radius={[0, 3, 3, 0]} />
        <Bar dataKey="y2025" fill="var(--color-y2025)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartContainer>
  );

  if (embedded) return chart;

  return <SectionBlock title={title} description={description}>{chart}</SectionBlock>;
}

function RemessasByDestinationGroupedBarChart({
  title,
  description,
  data,
  embedded = false,
}: {
  title: string;
  description: string;
  data: Array<{ destino: string; y2023: number; y2024: number; y2025: number }>;
  embedded?: boolean;
}) {
  if (!data.length) {
    if (embedded) {
      return <div className="text-sm text-muted-foreground">Sem dados.</div>;
    }
    return (
      <SectionBlock title={title} description={description}>
        <div className="text-sm text-muted-foreground">Sem dados.</div>
      </SectionBlock>
    );
  }

  const chart = (
    <ChartContainer
      config={{
        y2023: {
          label: "2023",
          color: DASHBOARD_CHART_COLORS.primary,
        },
        y2024: {
          label: "2024",
          color: DASHBOARD_CHART_COLORS.secondary,
        },
        y2025: {
          label: "2025",
          color: DASHBOARD_CHART_COLORS.tertiary,
        },
      }}
      className={data.length <= 4 ? "h-[360px] w-full" : "h-[540px] w-full"}
    >
      <BarChart
        data={data}
        layout={data.length <= 4 ? undefined : "vertical"}
        accessibilityLayer
        margin={{ left: 16, right: 16 }}
      >
        <CartesianGrid horizontal={data.length <= 4} vertical={data.length > 4} />
        <XAxis
          dataKey={data.length <= 4 ? "destino" : undefined}
          type={data.length <= 4 ? "category" : "number"}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          dataKey={data.length <= 4 ? undefined : "destino"}
          type={data.length <= 4 ? "number" : "category"}
          tickLine={false}
          axisLine={false}
          width={data.length <= 4 ? 56 : 170}
        />
        <Legend />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar
          dataKey="y2023"
          fill="var(--color-y2023)"
          radius={data.length <= 4 ? [4, 4, 0, 0] : [0, 3, 3, 0]}
        />
        <Bar
          dataKey="y2024"
          fill="var(--color-y2024)"
          radius={data.length <= 4 ? [4, 4, 0, 0] : [0, 3, 3, 0]}
        />
        <Bar
          dataKey="y2025"
          fill="var(--color-y2025)"
          radius={data.length <= 4 ? [4, 4, 0, 0] : [0, 3, 3, 0]}
        />
      </BarChart>
    </ChartContainer>
  );

  if (embedded) return chart;

  return <SectionBlock title={title} description={description}>{chart}</SectionBlock>;
}

function IdeSectorGroupedBarChart({
  title,
  description,
  data,
  embedded = false,
}: {
  title: string;
  description: string;
  data: Array<{ setor: string; y2023: number; y2024: number; y2025: number }>;
  embedded?: boolean;
}) {
  if (!data.length) {
    if (embedded) {
      return <div className="text-sm text-muted-foreground">Sem dados.</div>;
    }
    return (
      <SectionBlock title={title} description={description}>
        <div className="text-sm text-muted-foreground">Sem dados.</div>
      </SectionBlock>
    );
  }

  const chart = (
    <ChartContainer
      config={{
        y2023: {
          label: "2023",
          color: DASHBOARD_CHART_COLORS.primary,
        },
        y2024: {
          label: "2024",
          color: DASHBOARD_CHART_COLORS.secondary,
        },
        y2025: {
          label: "2025",
          color: DASHBOARD_CHART_COLORS.tertiary,
        },
      }}
      className="h-[420px] w-full"
    >
      <BarChart
        data={data}
        layout="vertical"
        accessibilityLayer
        margin={{ left: 16, right: 16 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis
          dataKey="setor"
          type="category"
          tickLine={false}
          axisLine={false}
          width={190}
        />
        <Legend />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar dataKey="y2023" fill="var(--color-y2023)" radius={[0, 3, 3, 0]} />
        <Bar dataKey="y2024" fill="var(--color-y2024)" radius={[0, 3, 3, 0]} />
        <Bar dataKey="y2025" fill="var(--color-y2025)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartContainer>
  );

  if (embedded) return chart;

  return <SectionBlock title={title} description={description}>{chart}</SectionBlock>;
}

function IdeByDestinationGroupedBarChart({
  title,
  description,
  data,
  embedded = false,
}: {
  title: string;
  description: string;
  data: Array<{ destino: string; y2023: number; y2024: number; y2025: number }>;
  embedded?: boolean;
}) {
  if (!data.length) {
    if (embedded) {
      return <div className="text-sm text-muted-foreground">Sem dados.</div>;
    }
    return (
      <SectionBlock title={title} description={description}>
        <div className="text-sm text-muted-foreground">Sem dados.</div>
      </SectionBlock>
    );
  }

  const chart = (
    <ChartContainer
      config={{
        y2023: {
          label: "2023",
          color: DASHBOARD_CHART_COLORS.primary,
        },
        y2024: {
          label: "2024",
          color: DASHBOARD_CHART_COLORS.secondary,
        },
        y2025: {
          label: "2025",
          color: DASHBOARD_CHART_COLORS.tertiary,
        },
      }}
      className={data.length <= 4 ? "h-[360px] w-full" : "h-[420px] w-full"}
    >
      <BarChart
        data={data}
        layout={data.length <= 4 ? undefined : "vertical"}
        accessibilityLayer
        margin={{ left: 16, right: 16 }}
      >
        <CartesianGrid horizontal={data.length <= 4} vertical={data.length > 4} />
        <XAxis
          dataKey={data.length <= 4 ? "destino" : undefined}
          type={data.length <= 4 ? "category" : "number"}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          dataKey={data.length <= 4 ? undefined : "destino"}
          type={data.length <= 4 ? "number" : "category"}
          tickLine={false}
          axisLine={false}
          width={data.length <= 4 ? 56 : 170}
        />
        <Legend />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar
          dataKey="y2023"
          fill="var(--color-y2023)"
          radius={data.length <= 4 ? [4, 4, 0, 0] : [0, 3, 3, 0]}
        />
        <Bar
          dataKey="y2024"
          fill="var(--color-y2024)"
          radius={data.length <= 4 ? [4, 4, 0, 0] : [0, 3, 3, 0]}
        />
        <Bar
          dataKey="y2025"
          fill="var(--color-y2025)"
          radius={data.length <= 4 ? [4, 4, 0, 0] : [0, 3, 3, 0]}
        />
      </BarChart>
    </ChartContainer>
  );

  if (embedded) return chart;

  return <SectionBlock title={title} description={description}>{chart}</SectionBlock>;
}

function IdeByCountryBarChart({
  title,
  description,
  data,
  embedded = false,
}: {
  title: string;
  description: string;
  data: Array<{ pais: string; valor: number }>;
  embedded?: boolean;
}) {
  if (!data.length) {
    if (embedded) {
      return <div className="text-sm text-muted-foreground">Sem dados.</div>;
    }
    return (
      <SectionBlock title={title} description={description}>
        <div className="text-sm text-muted-foreground">Sem dados.</div>
      </SectionBlock>
    );
  }

  const chart = (
    <ChartContainer
      config={{
        valor: {
          label: "IDE",
          color: DASHBOARD_CHART_COLORS.secondary,
        },
      }}
      className="h-[360px] w-full"
    >
      <BarChart data={data} layout="vertical" accessibilityLayer margin={{ left: 24, right: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis dataKey="pais" type="category" tickLine={false} axisLine={false} width={170} />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar dataKey="valor" fill="var(--color-valor)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );

  if (embedded) return chart;

  return <SectionBlock title={title} description={description}>{chart}</SectionBlock>;
}

function IdeSectorBarChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Array<{ setor: string; valor: number }>;
}) {
  if (!data.length) {
    return (
      <SectionBlock title={title} description={description}>
        <div className="text-sm text-muted-foreground">Sem dados.</div>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock title={title} description={description}>
      <ChartContainer
        config={{
          valor: {
            label: "IDE",
            color: DASHBOARD_CHART_COLORS.primary,
          },
        }}
        className="h-[340px] w-full"
      >
        <BarChart data={data} layout="vertical" accessibilityLayer margin={{ left: 16, right: 8 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} />
          <YAxis dataKey="setor" type="category" tickLine={false} axisLine={false} width={190} />
          <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
          <Bar dataKey="valor" fill="var(--color-valor)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    </SectionBlock>
  );
}

function IdeCountryExpandableTable({
  rows,
  year,
}: {
  rows: ExternalSectorIdeRow[];
  year: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">Sem dados.</div>;
  }

  const sorted = rows
    .slice()
    .sort((a, b) => (b.annual?.[year] ?? 0) - (a.annual?.[year] ?? 0));

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>pais</TableHead>
            <TableHead>{year}</TableHead>
            <TableHead>Q4 2025</TableHead>
            <TableHead>detalhe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const isOpen = Boolean(expanded[row.name]);
            const destinationRows = Object.entries(
              row.destination_breakdown_by_island ?? {}
            )
              .map(([destination, series]) => ({
                destination,
                y2023: series["2023"] ?? 0,
                y2024: series["2024"] ?? 0,
                y2025: series["2025"] ?? 0,
              }))
              .sort((a, b) => (b[`y${year as "2023" | "2024" | "2025"}`] ?? 0) - (a[`y${year as "2023" | "2024" | "2025"}`] ?? 0));

            return (
              <Fragment key={row.name}>
                <TableRow key={`${row.name}-main`}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{formatMillionsEscudos(row.annual?.[year] ?? 0)}</TableCell>
                  <TableCell>
                    {formatMillionsEscudos(row.quarterly_2025?.q4 ?? 0)}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [row.name]: !prev[row.name],
                        }))
                      }
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isOpen ? "fechar" : "expandir"}
                    </button>
                  </TableCell>
                </TableRow>
                {isOpen ? (
                  <TableRow key={`${row.name}-expanded`} className="bg-muted/30">
                    <TableCell colSpan={4}>
                      {destinationRows.length ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">
                            Destino do IDE por ilha (2023-2025)
                          </div>
                          <div className="rounded-md border border-border overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>ilha</TableHead>
                                  <TableHead>2023</TableHead>
                                  <TableHead>2024</TableHead>
                                  <TableHead>2025</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {destinationRows.map((entry) => (
                                  <TableRow key={`${row.name}-${entry.destination}`}>
                                    <TableCell>{entry.destination}</TableCell>
                                    <TableCell>{formatMillionsEscudos(entry.y2023)}</TableCell>
                                    <TableCell>{formatMillionsEscudos(entry.y2024)}</TableCell>
                                    <TableCell>{formatMillionsEscudos(entry.y2025)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Sem detalhe por destino para este país.
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function PaymentSystemSection({ ilha }: { ilha: string }) {
  const { data, loading, error } = useDashboardQuery<PaymentSystemDataset>({
    depsKey: "payment-system-2019-2023-v1",
    staleTimeMs: 24 * 60 * 60 * 1000,
    queryFn: async () =>
      fetchJsonOfflineFirst<PaymentSystemDataset>(
        "/api/finance/datasets?dataset=payment_system_2019_2023"
      ),
  });

  const formatValue = (value: number | null | undefined) =>
    typeof value === "number" ? formatInteger(value) : "n.a";

  const isAllIslands = ilha === ALL_ISLANDS_LABEL;
  const matchesSelectedIsland = (name: string) =>
    normalizeLabel(name) === normalizeLabel(ilha);

  const buildRows = (
    rows: PaymentSystemRow[] | undefined,
    label: "ilha" | "município"
  ) => {
    if (!rows?.length) return [];
    const total = rows.find((row) => normalizeLabel(row.name) === "total");
    const base = rows.filter((row) => normalizeLabel(row.name) !== "total");
    const filtered = isAllIslands ? base : base.filter((row) => matchesSelectedIsland(row.name));
    const merged = isAllIslands && total ? [...filtered, total] : filtered;

    return merged.map((row) => {
      const yearColumns = PAYMENT_YEARS.reduce<Record<string, string>>((acc, year) => {
        acc[year] = formatValue(row.values?.[year]);
        return acc;
      }, {});

      return {
        [label]: row.name,
        ...yearColumns,
      };
    });
  };

  if (loading && !data) {
    return (
      <SectionBlock title="Sistema de Pagamentos (2019-2023)" description="Em unidades.">
        <div className="text-sm text-muted-foreground">A carregar dados do sistema de pagamentos...</div>
      </SectionBlock>
    );
  }

  if (error || !data) {
    return (
      <SectionBlock title="Sistema de Pagamentos (2019-2023)" description="Em unidades.">
        <div className="text-sm text-muted-foreground">Falha ao carregar dados do sistema de pagamentos.</div>
      </SectionBlock>
    );
  }

  const bankingTotal2023 = data.banking_structure_by_island
    ?.find((row) => normalizeLabel(row.name) === "total")
    ?.values?.["2023"];
  const atmTotal2023 = data.atm_terminals_by_island
    ?.find((row) => normalizeLabel(row.name) === "total")
    ?.values?.["2023"];
  const posTotal2023 = data.pos_terminals_by_island
    ?.find((row) => normalizeLabel(row.name) === "total")
    ?.values?.["2023"];
  const coverageTotal2023 = data.atm_population_coverage_by_municipality
    ?.find((row) => normalizeLabel(row.name) === "total")
    ?.values?.["2023"];

  const bankingRows = buildRows(data.banking_structure_by_island, "ilha");
  const atmRows = buildRows(data.atm_terminals_by_island, "ilha");
  const posRows = buildRows(data.pos_terminals_by_island, "ilha");
  const coverageRows = buildRows(data.atm_population_coverage_by_municipality, "município");

  return (
    <SectionBlock
      title="Sistema de Pagamentos (2019-2023)"
      description={`Fonte: ${data.source?.publisher ?? "INE e SISP"} · Unidade: ${data.source?.unit ?? "unidades"}`}
    >
      <KpiGrid>
        <KpiStat label="Instituições de crédito (2023)" value={formatValue(bankingTotal2023)} />
        <KpiStat label="Terminais ATM (2023)" value={formatValue(atmTotal2023)} />
        <KpiStat label="Terminais POS (2023)" value={formatValue(posTotal2023)} />
        <KpiStat label="Cobertura populacional ATM (2023)" value={formatValue(coverageTotal2023)} />
      </KpiGrid>

      <div className="mt-6 space-y-6">
        <div className="space-y-2">
          <h3 className="font-medium">Estrutura do sistema bancário por ilha</h3>
          <FinanceTable rows={bankingRows} />
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Distribuição geográfica dos terminais ATM por ilha</h3>
          <FinanceTable rows={atmRows} />
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Distribuição geográfica dos terminais POS por ilha</h3>
          <FinanceTable rows={posRows} />
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Cobertura populacional por ATM por município</h3>
          <FinanceTable rows={coverageRows} />
        </div>
      </div>
    </SectionBlock>
  );
}

export default function FinancePage() {
  const [year, setYear] = useState("2025");
  const [ilha, setIlha] = useState("Maio");
  const [remessasOriginsView, setRemessasOriginsView] = useState<"chart" | "list">("list");
  const [remessasDestinationView, setRemessasDestinationView] = useState<"chart" | "list">("list");
  const [ideSectorView, setIdeSectorView] = useState<"chart" | "list">("list");
  const [ideDestinationView, setIdeDestinationView] = useState<"chart" | "list">("list");
  const [ideCountryMaioView, setIdeCountryMaioView] = useState<"chart" | "list">("list");

  const { data, loading, error } = useDashboardQuery<ExternalSectorDataset>({
    depsKey: "external-sector-bcv-2025-v3",
    staleTimeMs: 24 * 60 * 60 * 1000,
    queryFn: async () =>
      fetchJsonOfflineFirst<ExternalSectorDataset>(
        "/api/finance/datasets?dataset=external_sector_bcv_2025"
      ),
  });

  const selectedYear = useMemo(() => {
    const availableYears = data?.remessasEmigrantes?.totals?.annual
      ? Object.keys(data.remessasEmigrantes.totals.annual)
      : [];
    return availableYears.includes(year) ? year : "2025";
  }, [data, year]);

  const remessasAnnual =
    ilha === ALL_ISLANDS_LABEL
      ? data?.remessasEmigrantes?.totals?.annual?.[selectedYear] ?? null
      : (data?.remessasEmigrantes?.destino_concelhos_annual ?? []).find(
          (row) => normalizeLabel(row.name) === normalizeLabel(ilha)
        )?.annual?.[selectedYear] ?? null;
  const ideAnnual =
    ilha === ALL_ISLANDS_LABEL
      ? data?.ideCaboVerde?.totals?.annual?.[selectedYear] ?? null
      : (data?.ideCaboVerde?.by_destination_island ?? []).find(
          (row) => row.name.toLowerCase() === ilha.toLowerCase()
        )?.annual?.[selectedYear] ?? null;

  const previousYear = String(Number(selectedYear) - 1);
  const remessasPrevious =
    ilha === ALL_ISLANDS_LABEL
      ? data?.remessasEmigrantes?.totals?.annual?.[previousYear] ?? null
      : (data?.remessasEmigrantes?.destino_concelhos_annual ?? []).find(
          (row) => normalizeLabel(row.name) === normalizeLabel(ilha)
        )?.annual?.[previousYear] ?? null;
  const idePrevious =
    ilha === ALL_ISLANDS_LABEL
      ? data?.ideCaboVerde?.totals?.annual?.[previousYear] ?? null
      : (data?.ideCaboVerde?.by_destination_island ?? []).find(
          (row) => row.name.toLowerCase() === ilha.toLowerCase()
        )?.annual?.[previousYear] ?? null;

  const remessasYoY =
    remessasAnnual != null && remessasPrevious != null && remessasPrevious !== 0
      ? ((remessasAnnual - remessasPrevious) / remessasPrevious) * 100
      : null;
  const ideYoY =
    ideAnnual != null && idePrevious != null && idePrevious !== 0
      ? ((ideAnnual - idePrevious) / idePrevious) * 100
      : null;

  const byCountry = data?.ideCaboVerde?.by_country ?? [];
  const byDestination = data?.ideCaboVerde?.by_destination_island ?? [];
  const remessasDestinations = data?.remessasEmigrantes?.destino_concelhos_annual ?? [];

  const selectedRemessasDestination = remessasDestinations.find(
    (row) => normalizeLabel(row.name) === normalizeLabel(ilha)
  );
  const selectedIdeDestination = byDestination.find(
    (row) => row.name.toLowerCase() === ilha.toLowerCase()
  );

  const topIdeCountry = [...byCountry].sort(
    (a, b) => (b.annual?.[selectedYear] ?? 0) - (a.annual?.[selectedYear] ?? 0)
  )[0];

  const topIdeIsland = [...byDestination].sort(
    (a, b) => (b.annual?.[selectedYear] ?? 0) - (a.annual?.[selectedYear] ?? 0)
  )[0];

  const monthlyRemessasSource =
    ilha === ALL_ISLANDS_LABEL
      ? data?.remessasEmigrantes?.totals?.monthly_2025 ?? {}
      : selectedRemessasDestination?.monthly_2025 ??
        data?.remessasEmigrantes?.monthly_by_destination_2025?.[ilha] ??
        {};

  const monthlyRemessasRows = Object.entries(monthlyRemessasSource).map(([month, value]) => ({
    mês: month.toUpperCase(),
    valor: formatMillionsEscudos(value),
  }));

  const monthlyRemessasChartData = MONTH_ORDER.filter(
    (month) => typeof monthlyRemessasSource[month] === "number"
  ).map((month) => ({
    mês: month.toUpperCase(),
    valor: monthlyRemessasSource[month] as number,
  }));

  const yearlyRemessasSource =
    ilha === ALL_ISLANDS_LABEL
      ? data?.remessasEmigrantes?.totals?.annual ?? {}
      : selectedRemessasDestination?.annual ?? {};

  const yearlyRemessasChartData = YEARS.filter(
    (y) => typeof yearlyRemessasSource[y] === "number"
  )
    .slice()
    .reverse()
    .map((y) => ({
      ano: y,
      valor: yearlyRemessasSource[y] as number,
    }));

  const remessasOriginsRows = (data?.remessasEmigrantes?.paises_origem_annual ?? [])
    .slice()
    .sort((a, b) => (b.annual?.[selectedYear] ?? 0) - (a.annual?.[selectedYear] ?? 0))
    .map((row) => ({
      origem: row.name,
      "2023": formatMillionsEscudos(row.annual?.["2023"] ?? 0),
      "2024": formatMillionsEscudos(row.annual?.["2024"] ?? 0),
      "2025": formatMillionsEscudos(row.annual?.["2025"] ?? 0),
    }));

  const remessasOriginsGroupedChartData = (data?.remessasEmigrantes?.paises_origem_annual ?? [])
    .slice()
    .sort((a, b) => (b.annual?.[selectedYear] ?? 0) - (a.annual?.[selectedYear] ?? 0))
    .map((row) => ({
      origem: row.name,
      y2023: row.annual?.["2023"] ?? 0,
      y2024: row.annual?.["2024"] ?? 0,
      y2025: row.annual?.["2025"] ?? 0,
    }));

  const remessasDestinationRows = remessasDestinations
    .filter((row) =>
      ilha === ALL_ISLANDS_LABEL
        ? true
        : row.name.toLowerCase() === ilha.toLowerCase()
    )
    .sort((a, b) => (b.annual?.[selectedYear] ?? 0) - (a.annual?.[selectedYear] ?? 0))
    .map((row) => ({
      destino: row.name,
      "2023": formatMillionsEscudos(row.annual?.["2023"] ?? 0),
      "2024": formatMillionsEscudos(row.annual?.["2024"] ?? 0),
      "2025": formatMillionsEscudos(row.annual?.["2025"] ?? 0),
    }));

  const remessasDestinationGroupedChartData = remessasDestinations
    .filter((row) =>
      ilha === ALL_ISLANDS_LABEL
        ? true
        : row.name.toLowerCase() === ilha.toLowerCase()
    )
    .sort((a, b) => (b.annual?.[selectedYear] ?? 0) - (a.annual?.[selectedYear] ?? 0))
    .map((row) => ({
      destino: row.name,
      y2023: row.annual?.["2023"] ?? 0,
      y2024: row.annual?.["2024"] ?? 0,
      y2025: row.annual?.["2025"] ?? 0,
    }));

  const ideDestinationRows = byDestination
    .filter((row) =>
      ilha === ALL_ISLANDS_LABEL
        ? true
        : row.name.toLowerCase() === ilha.toLowerCase()
    )
    .sort((a, b) => (b.annual?.[selectedYear] ?? 0) - (a.annual?.[selectedYear] ?? 0))
    .map((row) => ({
      destino: row.name,
      "2023": formatMillionsEscudos(row.annual?.["2023"] ?? 0),
      "2024": formatMillionsEscudos(row.annual?.["2024"] ?? 0),
      "2025": formatMillionsEscudos(row.annual?.["2025"] ?? 0),
    }));

  const ideDestinationGroupedChartData = byDestination
    .filter((row) =>
      ilha === ALL_ISLANDS_LABEL
        ? true
        : row.name.toLowerCase() === ilha.toLowerCase()
    )
    .sort((a, b) => (b.annual?.[selectedYear] ?? 0) - (a.annual?.[selectedYear] ?? 0))
    .map((row) => ({
      destino: row.name,
      y2023: row.annual?.["2023"] ?? 0,
      y2024: row.annual?.["2024"] ?? 0,
      y2025: row.annual?.["2025"] ?? 0,
    }));

  const remessasShareMaio =
    selectedRemessasDestination?.annual?.[selectedYear] != null &&
    data?.remessasEmigrantes?.totals?.annual?.[selectedYear]
      ? (selectedRemessasDestination.annual[selectedYear] /
          data.remessasEmigrantes.totals.annual[selectedYear]) *
        100
      : null;

  const ideShareMaio =
    selectedIdeDestination?.annual?.[selectedYear] != null &&
    data?.ideCaboVerde?.totals?.annual?.[selectedYear]
      ? (selectedIdeDestination.annual[selectedYear] /
          data.ideCaboVerde.totals.annual[selectedYear]) *
        100
      : null;

  const selectedIslandKey = ilha;
  const isMaioIslandView = normalizeLabel(selectedIslandKey) === "maio";
  const ideCountryRowsForIsland = byCountry
    .map((row) => ({
      pais: row.name,
      y2023: row.destination_breakdown_by_island?.[selectedIslandKey]?.["2023"] ?? 0,
      y2024: row.destination_breakdown_by_island?.[selectedIslandKey]?.["2024"] ?? 0,
      y2025: row.destination_breakdown_by_island?.[selectedIslandKey]?.["2025"] ?? 0,
    }))
    .filter((row) =>
      isMaioIslandView ? row.y2023 !== 0 || row.y2024 !== 0 || row.y2025 !== 0 : true
    )
    .sort((a, b) => {
      const key = selectedYear === "2023" ? "y2023" : selectedYear === "2024" ? "y2024" : "y2025";
      return b[key] - a[key];
    })
    .map((row) => ({
      pais: row.pais,
      "2023": formatMillionsEscudos(row.y2023),
      "2024": formatMillionsEscudos(row.y2024),
      "2025": formatMillionsEscudos(row.y2025),
    }));

  const ideCountryChartForIsland = byCountry
    .map((row) => ({
      pais: row.name,
      valor: row.destination_breakdown_by_island?.[selectedIslandKey]?.[selectedYear] ?? 0,
    }))
    .filter((row) => (isMaioIslandView ? row.valor !== 0 : true))
    .sort((a, b) => b.valor - a.valor);

  const ideSectorByDestination = data?.ideCaboVerde?.sector_by_destination ?? [];
  const selectedSectorBreakdown = ideSectorByDestination.find(
    (entry) => normalizeLabel(entry.island) === normalizeLabel(ilha)
  );

  const aggregateSectorMap =
    ilha === ALL_ISLANDS_LABEL
      ? ideSectorByDestination.reduce<Record<string, AnnualSeries>>((acc, islandEntry) => {
          for (const sectorEntry of islandEntry.sectors) {
            const key = sectorEntry.sector;
            if (!acc[key]) acc[key] = { "2023": 0, "2024": 0, "2025": 0 };
            acc[key]["2023"] += sectorEntry.annual["2023"] ?? 0;
            acc[key]["2024"] += sectorEntry.annual["2024"] ?? 0;
            acc[key]["2025"] += sectorEntry.annual["2025"] ?? 0;
          }
          return acc;
        }, {})
      : null;

  const ideSectorTopLevel =
    ilha === ALL_ISLANDS_LABEL
      ? Object.entries(aggregateSectorMap ?? {}).map(([sector, annual]) => ({
          sector,
          annual,
        }))
      : selectedSectorBreakdown?.sectors ?? [];

  const ideSectorRows =
    ilha === ALL_ISLANDS_LABEL
      ? ideSectorTopLevel
          .slice()
          .sort((a, b) => (b.annual?.[selectedYear] ?? 0) - (a.annual?.[selectedYear] ?? 0))
          .map((entry) => ({
            setor: entry.sector,
            "2023": formatMillionsEscudos(entry.annual?.["2023"] ?? 0),
            "2024": formatMillionsEscudos(entry.annual?.["2024"] ?? 0),
            "2025": formatMillionsEscudos(entry.annual?.["2025"] ?? 0),
          }))
      : (selectedSectorBreakdown?.sectors ?? []).flatMap((entry) => [
          {
            setor: entry.sector,
            "2023": formatMillionsEscudos(entry.annual?.["2023"] ?? 0),
            "2024": formatMillionsEscudos(entry.annual?.["2024"] ?? 0),
            "2025": formatMillionsEscudos(entry.annual?.["2025"] ?? 0),
          },
          ...(entry.children ?? []).map((child) => ({
            setor: `- ${child.sector}`,
            "2023": formatMillionsEscudos(child.annual?.["2023"] ?? 0),
            "2024": formatMillionsEscudos(child.annual?.["2024"] ?? 0),
            "2025": formatMillionsEscudos(child.annual?.["2025"] ?? 0),
          })),
        ]);

  const ideSectorGroupedChartData =
    ilha === ALL_ISLANDS_LABEL
      ? ideSectorTopLevel
          .slice()
          .sort((a, b) => (b.annual?.[selectedYear] ?? 0) - (a.annual?.[selectedYear] ?? 0))
          .map((entry) => ({
            setor: entry.sector,
            y2023: entry.annual?.["2023"] ?? 0,
            y2024: entry.annual?.["2024"] ?? 0,
            y2025: entry.annual?.["2025"] ?? 0,
          }))
      : (selectedSectorBreakdown?.sectors ?? []).flatMap((entry) => [
          {
            setor: entry.sector,
            y2023: entry.annual?.["2023"] ?? 0,
            y2024: entry.annual?.["2024"] ?? 0,
            y2025: entry.annual?.["2025"] ?? 0,
          },
          ...(entry.children ?? []).map((child) => ({
            setor: `- ${child.sector}`,
            y2023: child.annual?.["2023"] ?? 0,
            y2024: child.annual?.["2024"] ?? 0,
            y2025: child.annual?.["2025"] ?? 0,
          })),
        ]);

  const ideSectorChartData = ideSectorTopLevel
    .map((entry) => ({
      setor: entry.sector,
      valor: entry.annual?.[selectedYear] ?? 0,
    }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 pt-8 pb-16 space-y-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-lg font-semibold sm:text-xl">Finanças Externas</h1>
            <p className="text-sm text-muted-foreground">
              Remessas de emigrantes em divisas e Investimento Direto Estrangeiro (IDE).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <Select value={ilha} onValueChange={setIlha}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISLANDS.map((island) => (
                  <SelectItem key={island} value={island}>
                    {island}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full sm:w-[120px]">
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

        {loading && !data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-28" />
              </div>
            ))}
          </div>
        ) : error || !data ? (
          <div className="text-sm text-muted-foreground">
            Falha ao carregar o dataset de remessas e IDE.
          </div>
        ) : (
          <>
            <SectionBlock
              title="Remessas de emigrantes em divisas"
              description={`Fonte: ${data.source?.publisher ?? "Banco de Cabo Verde"} · ${data.source?.unit ?? "milhoes de escudos"}`}
            >
              <KpiGrid>
                <KpiStat
                  label={
                    ilha === ALL_ISLANDS_LABEL
                      ? `Remessas de emigrantes (${selectedYear})`
                      : `Remessas recebidas (${ilha}, ${selectedYear})`
                  }
                  value={remessasAnnual != null ? formatMillionsEscudos(remessasAnnual) : "—"}
                />
                <KpiStat
                  label={
                    ilha === ALL_ISLANDS_LABEL
                      ? `IDE total (${selectedYear})`
                      : `IDE recebido (${ilha}, ${selectedYear})`
                  }
                  value={ideAnnual != null ? formatMillionsEscudos(ideAnnual) : "—"}
                />
                <KpiStat label="Variacao remessas (YoY)" value={formatDeltaPercent(remessasYoY)} />
                <KpiStat label="Variacao IDE (YoY)" value={formatDeltaPercent(ideYoY)} />
              </KpiGrid>

              {ilha === ALL_ISLANDS_LABEL ? (
                <KpiGrid>
                  <KpiStat
                    label={`Principal origem IDE (${selectedYear})`}
                    value={
                      topIdeCountry
                        ? `${topIdeCountry.name} · ${formatOneDecimal(topIdeCountry.annual?.[selectedYear] ?? 0)}`
                        : "—"
                    }
                  />
                  <KpiStat
                    label={`Principal ilha destino IDE (${selectedYear})`}
                    value={
                      topIdeIsland
                        ? `${topIdeIsland.name} · ${formatOneDecimal(topIdeIsland.annual?.[selectedYear] ?? 0)}`
                        : "—"
                    }
                  />
                  <KpiStat
                    label="IDE 2025 Q4"
                    value={formatMillionsEscudos(data.ideCaboVerde?.totals?.quarterly_2025?.q4 ?? 0)}
                  />
                  <KpiStat
                    label="Remessas 2025 Dez"
                    value={formatMillionsEscudos(data.remessasEmigrantes?.totals?.monthly_2025?.dez ?? 0)}
                  />
                </KpiGrid>
              ) : (
                <KpiGrid>
                  <KpiStat
                    label={`Peso de ${ilha} nas remessas (${selectedYear})`}
                    value={remessasShareMaio != null ? `${remessasShareMaio.toFixed(2)}%` : "—"}
                  />
                  <KpiStat
                    label={`Peso de ${ilha} no IDE (${selectedYear})`}
                    value={ideShareMaio != null ? `${ideShareMaio.toFixed(2)}%` : "—"}
                  />
                  <KpiStat
                    label={`${ilha} Investimento Direto Estrangeiro Q4 2025`}
                    value={formatMillionsEscudos(selectedIdeDestination?.quarterly_2025?.q4 ?? 0)}
                  />
                  <KpiStat
                    label={`${ilha} Remessas Dez 2025`}
                    value={formatMillionsEscudos(selectedRemessasDestination?.monthly_2025?.dez ?? 0)}
                  />
                </KpiGrid>
              )}
            </SectionBlock>

            {SHOW_MONTHLY_REMESSAS_TABLE ? (
              <SectionBlock
                title="Remessas mensais"
                description={
                  ilha === ALL_ISLANDS_LABEL
                    ? "Serie mensal de 2025 (total nacional)."
                    : `Serie mensal de 2025 (${ilha}).`
                }
              >
                <FinanceTable rows={monthlyRemessasRows} />
              </SectionBlock>
            ) : null}

            <RemessasBarChart
              title="Grafico mensal de Remessas de Emigrantes "
              description={
                ilha === ALL_ISLANDS_LABEL
                  ? "Em milhões de escudos."
                  : `Remessas mensais recebidas em ${ilha} (2025).`
              }
              data={monthlyRemessasChartData}
              xKey="mês"
            />

            <RemessasBarChart
              title="Grafico anual de Remessas de Emigrantes "
              description={
                ilha === ALL_ISLANDS_LABEL
                  ? "Em milhões de escudos."
                  : `Em milhões de escudos.`
              }
              data={yearlyRemessasChartData}
              xKey="ano"
            />

            <SectionBlock
              title="Remessas de Emigrantes em Divisas"
              description="Em milhões de escudos."
            >
              <div className="mb-3 flex justify-start">
                <div className="inline-flex rounded-lg border border-border bg-card p-1">
                  <button
                    type="button"
                    onClick={() => setRemessasDestinationView("chart")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      remessasDestinationView === "chart"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Gráfico
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemessasDestinationView("list")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      remessasDestinationView === "list"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Lista
                  </button>
                </div>
              </div>

              {remessasDestinationView === "chart" ? (
                <RemessasByDestinationGroupedBarChart
                  title=""
                  description=""
                  data={remessasDestinationGroupedChartData}
                  embedded
                />
              ) : (
                <FinanceTable rows={remessasDestinationRows} />
              )}
            </SectionBlock>

            {ilha === ALL_ISLANDS_LABEL ? (
              <SectionBlock
                title="Remessas de Emigrantes por pais de origem"
                description="Em milhões de escudos."
              >
                <div className="mb-3 flex justify-start">
                  <div className="inline-flex rounded-lg border border-border bg-card p-1">
                    <button
                      type="button"
                      onClick={() => setRemessasOriginsView("chart")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        remessasOriginsView === "chart"
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Gráfico
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemessasOriginsView("list")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        remessasOriginsView === "list"
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Lista
                    </button>
                  </div>
                </div>

                {remessasOriginsView === "chart" ? (
                  <RemessasByCountryGroupedBarChart
                    title=""
                    description=""
                    data={remessasOriginsGroupedChartData}
                    embedded
                  />
                ) : (
                  <FinanceTable rows={remessasOriginsRows} />
                )}
              </SectionBlock>
            ) : null}

            <SectionBlock
              title="Investimento Direto Estrangeiro em Cabo Verde por destino"
              description="Em milhões de escudos."
            >
              <div className="mb-3 flex justify-start">
                <div className="inline-flex rounded-lg border border-border bg-card p-1">
                  <button
                    type="button"
                    onClick={() => setIdeDestinationView("chart")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      ideDestinationView === "chart"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Gráfico
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdeDestinationView("list")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      ideDestinationView === "list"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Lista
                  </button>
                </div>
              </div>

              {ideDestinationView === "chart" ? (
                <IdeByDestinationGroupedBarChart
                  title=""
                  description=""
                  data={ideDestinationGroupedChartData}
                  embedded
                />
              ) : (
                <FinanceTable rows={ideDestinationRows} />
              )}
            </SectionBlock>

            <SectionBlock
              title={ilha === ALL_ISLANDS_LABEL ? "Investimento Direto Estrangeiro em Cabo Verde por setor (agregado)" : `Investimento Direto Estrangeiro em Cabo Verde por setor (${ilha})`}
              description={
                ilha === ALL_ISLANDS_LABEL
                  ? "Em milhões de escudos."
                  : `Detalhe setorial do IDE em ${ilha} (2023-2025).`
              }
            >
              <div className="mb-3 flex justify-start">
                <div className="inline-flex rounded-lg border border-border bg-card p-1">
                  <button
                    type="button"
                    onClick={() => setIdeSectorView("chart")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      ideSectorView === "chart"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Gráfico
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdeSectorView("list")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      ideSectorView === "list"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Lista
                  </button>
                </div>
              </div>

              {ideSectorView === "chart" ? (
                <IdeSectorGroupedBarChart
                  title=""
                  description=""
                  data={ideSectorGroupedChartData}
                  embedded
                />
              ) : (
                <FinanceTable rows={ideSectorRows} />
              )}
            </SectionBlock>

            {/* <IdeSectorBarChart
              title={ilha === ALL_ISLANDS_LABEL ? "Grafico IDE por setor (agregado)" : `Grafico IDE por setor (${ilha})`}
              description={`Distribuicao setorial no ano ${selectedYear}.`}
              data={ideSectorChartData}
            /> */}

            {/* {ilha === ALL_ISLANDS_LABEL ? (
              <SectionBlock title="IDE por pais de origem" description="Anual e Q4 de 2025.">
                <IdeCountryExpandableTable rows={byCountry} year={selectedYear} />
              </SectionBlock>
            ) : (
              <SectionBlock
                title={`Investimento Direto Estrangeiro em Cabo Verde por pais de origem (${ilha})`}
                description={`Investimento destinado a ${ilha}, por pais de origem (2023-2025).`}
              >
                <FinanceTable rows={ideCountryRowsForIsland} />
              </SectionBlock>
            )} */}

            {ilha !== ALL_ISLANDS_LABEL ? (
              <SectionBlock
                title={`Investimento Direto Estrangeiro em Cabo Verde por pais (${ilha})`}
                description={`Distribuicao do IDE recebido por ${ilha} no ano ${selectedYear}.`}
              >
                <div className="mb-3 flex justify-start">
                  <div className="inline-flex rounded-lg border border-border bg-card p-1">
                    <button
                      type="button"
                      onClick={() => setIdeCountryMaioView("chart")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        ideCountryMaioView === "chart"
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Gráfico
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdeCountryMaioView("list")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        ideCountryMaioView === "list"
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Lista
                    </button>
                  </div>
                </div>

                {ideCountryMaioView === "chart" ? (
                  <IdeByCountryBarChart
                    title=""
                    description=""
                    data={ideCountryChartForIsland}
                    embedded
                  />
                ) : (
                  <FinanceTable rows={ideCountryRowsForIsland} />
                )}
              </SectionBlock>
            ) : null}

            <PaymentSystemSection ilha={ilha} />
          </>
        )}
      </div>
    </div>
  );
}
