"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import DashboardChatWidget from "@/components/DashboardChatWidget";
import { ThemeToggle } from "@/components/theme-toggle";
import { SectionBlock } from "@/components/dashboard/SectionBlock";
import { KpiGrid, KpiStat } from "@/components/dashboard/KpiStat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { fetchJsonOfflineFirst } from "@/lib/offline";
import type {
  BudgetApiResponse,
  BudgetBreakdownItem,
  BudgetProjectItem,
} from "@/lib/budget";

const YEARS = ["2026", "2025"];
const BUDGET_CHAT_PROMPT_SETS = [
  [
    "Quais são os 3 maiores riscos do orçamento de 2026 e como mitigar?",
    "Que programas concentram mais investimento e que impacto prático isso sugere?",
    "Compara 2025 vs 2026: o que melhorou, o que piorou e qual a prioridade agora?",
  ],
  [
    "Onde o orçamento está mais exposto a dependência de financiamento externo?",
    "Quais projetos parecem ter maior retorno público no curto prazo?",
    "Se tivesses de cortar 5% da despesa, onde os dados sugerem menor impacto social?",
  ],
  [
    "Que leitura executiva podes fazer do orçamento: força, risco e decisão imediata?",
    "Qual rubrica de despesa merece maior monitorização mensal e porquê?",
    "Que ajustes estratégicos fariam o orçamento mais resiliente no próximo ano?",
  ],
];
const FUNDING_SOURCE_COLORS = [
  "#6f779b",
  "#4b4fa3",
  "#2f5ea8",
  "#9249b5",
  "#c76d2d",
  "#6b7280",
];

const formatCve = (value: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "CVE",
    maximumFractionDigits: 0,
  }).format(value);

const formatCompactCve = (value: number) =>
  `${new Intl.NumberFormat("pt-PT", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value)} CVE`;

const formatPercent = (value: number | null | undefined) =>
  typeof value === "number" ? `${value.toFixed(2)}%` : "—";

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("pt-PT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    : "—";

function LoadingTable() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: 4 }).map((_, index) => (
              <TableHead key={index}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: 4 }).map((__, cellIndex) => (
                <TableCell key={cellIndex}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function BreakdownBars({
  items,
  colorClassName,
}: {
  items: BudgetBreakdownItem[];
  colorClassName: string;
}) {
  if (!items.length) {
    return <EmptyState message="Sem dados para esta secção." />;
  }

  const maxValue = Math.max(...items.map((item) => item.amountCve), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.code ?? item.label}-${item.amountCve}`} className="space-y-1.5">
          <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
              <div className="font-medium leading-tight">{item.label}</div>
              {item.code ? (
                <div className="text-xs text-muted-foreground">{item.code}</div>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <div className="font-medium">{formatCompactCve(item.amountCve)}</div>
              <div className="text-xs text-muted-foreground">
                {formatPercent(item.sharePct)}
              </div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted/70">
            <div
              className={`h-2 rounded-full ${colorClassName}`}
              style={{ width: `${Math.max((item.amountCve / maxValue) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type GroupedProjects = {
  programName: string;
  totalAmountCve: number;
  projectCount: number;
  projects: BudgetProjectItem[];
};

export default function OrcamentoPage() {
  const [year, setYear] = useState("2026");
  const [data, setData] = useState<BudgetApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJsonOfflineFirst<BudgetApiResponse>(
          `/api/transparencia/municipal/maio/orcamento?year=${year}`
        );

        if (cancelled) return;

        if (!payload || !payload.summary) {
          setData(null);
          setError("Falha ao carregar orçamento.");
          return;
        }

        setData(payload);
      } catch {
        if (!cancelled) {
          setData(null);
          setError("Falha ao carregar orçamento.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [year]);

  const summary = data?.summary;
  const isSurplus = (summary?.fiscalBalanceCve ?? 0) >= 0;
  const groupedProjects = useMemo<GroupedProjects[]>(() => {
    if (!data) return [];

    const groups = new Map<string, GroupedProjects>();

    for (const project of data.investmentProjects) {
      const current = groups.get(project.programName) ?? {
        programName: project.programName,
        totalAmountCve: 0,
        projectCount: 0,
        projects: [],
      };

      current.totalAmountCve += project.amountCve;
      current.projectCount += 1;
      current.projects.push(project);
      groups.set(project.programName, current);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        projects: group.projects.sort((a, b) => b.amountCve - a.amountCve),
      }))
      .sort((a, b) => b.totalAmountCve - a.totalAmountCve);
  }, [data]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-center bg-no-repeat opacity-[0.04] dark:opacity-[0.035]"
        style={{
          backgroundImage: "url('/maioazul.png')",
          backgroundSize: "300px",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-2 pb-16 space-y-6">
        <div className="border-b border-border">
          <div className="pt-6 pb-6 space-y-3">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-2">
                <div className="hidden flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Transparência Municipal</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span>Orçamento</span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Orçamento Municipal do Maio</h1>
                  <p className="hidden text-sm text-muted-foreground sm:block">
                    Receitas, despesas, investimento e enquadramento legal do orçamento
                    aprovado.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-foreground transition hover:bg-accent"
                >
                  Dashboard
                </Link>
                <ThemeToggle />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <>
            <KpiGrid>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-border bg-card p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-7 w-28" />
                </div>
              ))}
            </KpiGrid>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-10 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-10 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <LoadingTable />
          </>
        ) : error || !data || !summary ? (
          <EmptyState message={error ?? "Sem dados disponíveis para o ano selecionado."} />
        ) : (
          <>
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <strong>Fonte:</strong> {data.sourceDocument.title ?? "Documento publicado"}.
              Publicado em {formatDate(data.sourceDocument.publicationDate)} no BO{" "}
              {data.sourceDocument.publicationIssueNumber ?? "—"}.
              {data.notes.length ? ` ${data.notes[0]}` : ""}
            </div>

            <KpiGrid>
              <KpiStat label="Receita total" value={formatCompactCve(summary.totalRevenueCve)} />
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Despesa total</div>
                <div className="mt-1 text-xl font-semibold">
                  {formatCompactCve(summary.totalExpenseCve)}
                </div>
              </div>
              {summary.fiscalBalanceCve !== 0 ? (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="text-xs text-muted-foreground">
                    {isSurplus ? "Saldo orçamental" : "Necessidade de financiamento"}
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {formatCompactCve(Math.abs(summary.fiscalBalanceCve))}
                  </div>
                </div>
              ) : null}
              <KpiStat
                label="Peso do investimento"
                value={formatPercent(summary.investmentSharePct)}
              />
            </KpiGrid>

            <div className="grid">
              <SectionBlock
                title="Totais estruturais"
                description="Leitura rápida da composição corrente e de capital."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Receita</CardTitle>
                      <CardDescription>Corrente vs. capital</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 xl:grid-cols-2">
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="text-sm text-muted-foreground">Receita corrente</div>
                          <div className="mt-2 text-xl font-semibold">
                            {formatCve(summary.currentRevenueCve)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="text-sm text-muted-foreground">Receita de capital</div>
                          <div className="mt-2 text-xl font-semibold">
                            {formatCve(summary.capitalRevenueCve)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Despesa</CardTitle>
                      <CardDescription>Funcionamento vs. investimento</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 xl:grid-cols-2">
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="text-sm text-muted-foreground">Despesa corrente</div>
                          <div className="mt-2 text-xl font-semibold">
                            {formatCve(summary.currentExpenseCve)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="text-sm text-muted-foreground">Despesa de capital</div>
                          <div className="mt-2 text-xl font-semibold">
                            {formatCve(summary.capitalExpenseCve)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </SectionBlock>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Receitas por classificação económica</CardTitle>
                  <CardDescription>
                    Leitura consolidada das principais rubricas de receita.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BreakdownBars
                    items={data.revenueBreakdown}
                    colorClassName="bg-[#1d8f6d]"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Despesas por classificação económica</CardTitle>
                  <CardDescription>
                    Estrutura do orçamento entre pessoal, operações e investimento.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BreakdownBars
                    items={data.expenseBreakdown}
                    colorClassName="bg-[#c76d2d]"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Afetação funcional</CardTitle>
                  <CardDescription>
                    Onde o orçamento se concentra por função pública.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BreakdownBars
                    items={data.functionalBreakdown}
                    colorClassName="bg-[#2f5ea8]"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fontes de financiamento do investimento</CardTitle>
                  <CardDescription>
                    Composição das fontes que suportam os projetos publicados.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.fundingSources.length ? (
                    <div className="space-y-4">
                      {data.fundingSources.map((source) => (
                        <div
                          key={`${source.label}-${source.amountCve}`}
                          className="rounded-lg border border-border bg-muted/20 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-medium">{source.label}</div>
                            </div>
                            <div className="text-right font-medium">
                              {formatCompactCve(source.amountCve)}
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="rounded-lg border border-border bg-muted/10 p-4">
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data.fundingSources}
                                dataKey="amountCve"
                                nameKey="label"
                                innerRadius={58}
                                outerRadius={92}
                                paddingAngle={2}
                                stroke="none"
                              >
                                {data.fundingSources.map((source, index) => (
                                  <Cell
                                    key={`${source.label}-slice`}
                                    fill={FUNDING_SOURCE_COLORS[index % FUNDING_SOURCE_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number) => formatCve(value)}
                                contentStyle={{
                                  borderRadius: "12px",
                                  border: "1px solid var(--border)",
                                  background: "var(--card)",
                                  color: "var(--foreground)",
                                }}
                                itemStyle={{ color: "var(--foreground)" }}
                                labelStyle={{ color: "var(--foreground)" }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="Sem fontes de financiamento estruturadas para este ano." />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Programas de investimento</CardTitle>
                <CardDescription>
                  Agregação dos projetos por eixo ou programa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.investmentPrograms.length ? (
                  <BreakdownBars
                    items={data.investmentPrograms.map((program) => ({
                      code: null,
                      label: `${program.label} · ${program.projectCount} projetos`,
                      amountCve: program.amountCve,
                      sharePct: null,
                    }))}
                    colorClassName="bg-[#9249b5]"
                  />
                ) : (
                  <EmptyState message="Sem programa de investimento publicado." />
                )}
              </CardContent>
            </Card>

            <SectionBlock
              title="Principais projetos"
              description="Projetos agrupados por programa. Clique para abrir o detalhe."
            >
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {groupedProjects.map((group) => (
                    <details key={group.programName} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 bg-card px-4 py-4 marker:hidden transition hover:bg-muted/20">
                        <div className="min-w-0">
                          <div className="font-medium">{group.programName}</div>
                          <div className="text-sm text-muted-foreground">
                            {group.projectCount} projetos
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCve(group.totalAmountCve)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              total do programa
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
                        </div>
                      </summary>

                      <div className="border-t border-border bg-muted/10 px-4 py-3">
                        <div className="rounded-lg border border-border overflow-x-auto bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Subprograma</TableHead>
                                <TableHead>Projeto</TableHead>
                                <TableHead className="text-right">Montante</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.projects.map((project) => (
                                <TableRow
                                  key={`${group.programName}-${project.projectName}-${project.amountCve}`}
                                >
                                  <TableCell className="align-top text-muted-foreground">
                                    {project.subprogramName ?? ""}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    {project.projectName}
                                  </TableCell>
                                  <TableCell className="text-right align-top">
                                    {formatCve(project.amountCve)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </SectionBlock>

            <div>
              <SectionBlock
                title="Despesas por unidade orgânica"
                description="Distribuição consolidada por estruturas municipais publicadas."
              >
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unidade</TableHead>
                        <TableHead className="text-right">Montante</TableHead>
                        <TableHead className="text-right">Peso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.departmentBreakdown.map((item) => (
                        <TableRow key={`${item.label}-${item.amountCve}`}>
                          <TableCell>{item.label}</TableCell>
                          <TableCell className="text-right">
                            {formatCve(item.amountCve)}
                          </TableCell>
                          <TableCell className="text-right">{formatPercent(item.sharePct)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </SectionBlock>
            </div>
          </>
        )}
      </div>
      <DashboardChatWidget
        context={{ surface: "orcamento", year: Number(year) }}
        placeholder="Pergunte sobre o orçamento..."
        quickPromptSets={BUDGET_CHAT_PROMPT_SETS}
        storageKey="maioazul-site-chat-budget-v1"
        welcomeMessage="Pergunte sobre o orçamento municipal do Maio, projetos, fontes de financiamento ou diferenças entre 2025 e 2026."
      />
    </div>
  );
}
