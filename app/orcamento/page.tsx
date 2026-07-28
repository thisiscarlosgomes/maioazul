"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import DashboardChatWidget from "@/components/DashboardChatWidget";
import { SectionBlock } from "@/components/dashboard/SectionBlock";
import { KpiGrid, KpiStat } from "@/components/dashboard/KpiStat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  BudgetStaffingPosition,
} from "@/lib/budget";

const FIXED_BUDGET_YEAR = "2026";
const FUNDING_SOURCE_COLORS = [
  "#1E78FF",
  "#FFB703",
  "#22C55E",
  "#14B8A6",
  "#8B5CF6",
  "#6B7280",
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

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-PT").format(value);

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

const normalizeDepartmentKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\btransportes\b/gi, "transporte")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

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

  const totalValue = items.reduce((sum, item) => sum + item.amountCve, 0);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.code ?? item.label}-${item.amountCve}`} className="space-y-1.5">
          {(() => {
            const fallbackShare = totalValue > 0 ? (item.amountCve / totalValue) * 100 : 0;
            const share = typeof item.sharePct === "number" ? item.sharePct : fallbackShare;
            const widthPct = Math.max(Math.min(share, 100), 4);

            return (
              <>
          <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
              <div className="font-medium leading-tight">{item.label}</div>
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
              style={{ width: `${widthPct}%` }}
            />
          </div>
              </>
            );
          })()}
        </div>
      ))}
    </div>
  );
}

type GroupedProjects = {
  programName: string;
  totalAmountCve: number;
  sharePct: number;
  projectCount: number;
  projects: BudgetProjectItem[];
};

export default function OrcamentoPage() {
  const year = FIXED_BUDGET_YEAR;
  const [data, setData] = useState<BudgetApiResponse | null>(null);
  const [compensationData, setCompensationData] = useState<{
    year: number;
    framework: NonNullable<BudgetApiResponse["compensationFramework"]>;
    staffingPositions: BudgetStaffingPosition[];
  } | null>(null);
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
          setCompensationData(null);
          setError("Falha ao carregar orçamento.");
          return;
        }

        let resolvedCompensation = payload.compensationFramework;
        let resolvedCompensationYear = payload.year;
        let resolvedCompensationStaffingPositions = payload.staffingPositions ?? [];

        if (!resolvedCompensation && payload.year !== 2025) {
          try {
            const fallback2025 = await fetchJsonOfflineFirst<BudgetApiResponse>(
              "/api/transparencia/municipal/maio/orcamento?year=2025"
            );

            if (fallback2025?.compensationFramework) {
              resolvedCompensation = fallback2025.compensationFramework;
              resolvedCompensationYear = fallback2025.year;
              resolvedCompensationStaffingPositions = fallback2025.staffingPositions ?? [];
            }
          } catch {
            // fallback is optional; ignore and keep main payload
          }
        }

        setCompensationData(
          resolvedCompensation
            ? {
                year: resolvedCompensationYear,
                framework: resolvedCompensation,
                staffingPositions: resolvedCompensationStaffingPositions,
              }
            : null
        );
        setData(payload);
      } catch {
        if (!cancelled) {
          setData(null);
          setCompensationData(null);
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
  const compensationFramework = compensationData?.framework ?? null;
  const staffingPositions = useMemo<BudgetStaffingPosition[]>(
    () => compensationData?.staffingPositions ?? data?.staffingPositions ?? [],
    [compensationData?.staffingPositions, data?.staffingPositions],
  );
  const staffingByDepartment = useMemo(() => {
    const grouped = new Map<string, typeof staffingPositions>();

    for (const row of staffingPositions) {
      const key = normalizeDepartmentKey(row.costCenterName);
      const current = grouped.get(key) ?? [];
      current.push(row);
      grouped.set(key, current);
    }

    for (const [key, rows] of grouped) {
      grouped.set(
        key,
        rows.sort((a, b) => b.annualSalaryCve - a.annualSalaryCve),
      );
    }

    return grouped;
  }, [staffingPositions]);
  const adjustmentItemsByDepartment = useMemo(() => {
    const grouped = new Map<
      string,
      Array<{
        id: string;
        positionTitle: string;
        staffGroup: string | null;
        vacancyCount: number;
        monthlySalaryCve: number;
        annualSalaryCve: number;
      }>
    >();

    const items = compensationFramework?.adjustments?.items ?? [];
    for (const item of items) {
      const key = normalizeDepartmentKey(item.departmentName);
      const current = grouped.get(key) ?? [];
      current.push({
        id: `adj-${key}-${item.positionTitle}-${item.annualCve}`,
        positionTitle: item.positionTitle,
        staffGroup: item.employmentType,
        vacancyCount: item.vacancies,
        monthlySalaryCve: item.monthlyCve,
        annualSalaryCve: item.annualCve,
      });
      grouped.set(key, current);
    }

    return grouped;
  }, [compensationFramework?.adjustments?.items]);
  const compensationDepartments = useMemo(() => {
    const base = compensationFramework?.base?.departments ?? [];
    const adjustments = compensationFramework?.adjustments?.departments ?? [];
    const merged = new Map<
      string,
      {
        departmentName: string;
        vacancies: number;
        monthlyCve: number;
        annualCve: number;
      }
    >();

    for (const row of base) {
      const key = normalizeDepartmentKey(row.departmentName);
      merged.set(key, {
        departmentName: row.departmentName,
        vacancies: row.vacancies,
        monthlyCve: row.monthlyCve,
        annualCve: row.annualCve,
      });
    }

    for (const row of adjustments) {
      const key = normalizeDepartmentKey(row.departmentName);
      const current = merged.get(key);
      if (current) {
        current.vacancies += row.vacancies;
        current.monthlyCve += row.monthlyCve;
        current.annualCve += row.annualCve;
      } else {
        merged.set(key, {
          departmentName: row.departmentName,
          vacancies: row.vacancies,
          monthlyCve: row.monthlyCve,
          annualCve: row.annualCve,
        });
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.annualCve - a.annualCve);
  }, [compensationFramework?.base?.departments, compensationFramework?.adjustments?.departments]);
  const groupedProjects = useMemo<GroupedProjects[]>(() => {
    if (!data) return [];

    const groups = new Map<string, GroupedProjects>();

    for (const project of data.investmentProjects) {
      const current = groups.get(project.programName) ?? {
        programName: project.programName,
        totalAmountCve: 0,
        sharePct: 0,
        projectCount: 0,
        projects: [] as BudgetProjectItem[],
      };

      current.totalAmountCve += project.amountCve;
      current.projectCount += 1;
      current.projects.push(project);
      groups.set(project.programName, current);
    }

    const values = Array.from(groups.values());
    const totalAmount = values.reduce((sum, group) => sum + group.totalAmountCve, 0);

    return values
      .map((group) => ({
        ...group,
        sharePct:
          totalAmount > 0 ? Number(((group.totalAmountCve / totalAmount) * 100).toFixed(2)) : 0,
        projects: group.projects.sort((a, b) => b.amountCve - a.amountCve),
      }))
      .sort((a, b) => b.totalAmountCve - a.totalAmountCve);
  }, [data]);
  const projectStats = useMemo(() => {
    const projects = data?.investmentProjects ?? [];
    const totalAllocatedCve = projects.reduce((sum, project) => sum + project.amountCve, 0);
    const topProject = projects.reduce<BudgetProjectItem | null>(
      (currentTop, project) =>
        !currentTop || project.amountCve > currentTop.amountCve ? project : currentTop,
      null,
    );

    return {
      totalAllocatedCve,
      projectCount: projects.length,
      topProject,
    };
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
        <div className="pt-6">
          <h1 className="text-lg font-semibold sm:text-xl">Orçamento Municipal do Maio 2026</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Receitas, despesas, investimento e enquadramento legal do orçamento aprovado.
          </p>
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
            <KpiGrid>
              <KpiStat label="Receita total" value={formatCompactCve(summary.totalRevenueCve)} />
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Despesa total</div>
                <div className="mt-1 text-lg font-semibold sm:text-xl">
                  {formatCompactCve(summary.totalExpenseCve)}
                </div>
              </div>
              {summary.fiscalBalanceCve !== 0 ? (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="text-xs text-muted-foreground">
                    {isSurplus ? "Saldo orçamental" : "Necessidade de financiamento"}
                  </div>
                  <div className="mt-1 text-lg font-semibold sm:text-xl">
                    {formatCompactCve(Math.abs(summary.fiscalBalanceCve))}
                  </div>
                </div>
              ) : null}
              <KpiStat
                label="Peso do investimento"
                value={formatPercent(summary.investmentSharePct)}
              />
            </KpiGrid>

            {compensationFramework ? (
              <SectionBlock
                title="Quadro de compensação do pessoal"
                description={`Quadro base e acréscimos projetados (ultima referência ${compensationData?.year}).`}
              >
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">

                     <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Total Mensal</div>
                        <div className="mt-1 text-lg font-semibold sm:text-xl">
                          {formatCve(compensationFramework.combined.totalMonthlyCve)}
                        </div>
                      </CardContent>
                    </Card>

                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Total Anual</div>
                        <div className="mt-1 text-lg font-semibold sm:text-xl">
                          {formatCve(compensationFramework.combined.totalAnnualCve)}
                        </div>
                      </CardContent>
                    </Card>
                   
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Nº Vagas</div>
                        <div className="mt-1 text-lg font-semibold sm:text-xl">
                          {formatNumber(compensationFramework.combined.totalVacancies)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {compensationDepartments.length ? (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div className="divide-y divide-border">
                        {compensationDepartments.map((row) => {
                          const key = normalizeDepartmentKey(row.departmentName);
                          const basePositions = staffingByDepartment.get(key) ?? [];
                          const projectedPositions = adjustmentItemsByDepartment.get(key) ?? [];
                          const existingKeys = new Set(
                            basePositions.map(
                              (position) =>
                                `${position.positionTitle.toLowerCase()}|${position.vacancyCount}|${position.annualSalaryCve}`,
                            ),
                          );
                          const mergedPositions = [
                            ...basePositions,
                            ...projectedPositions.filter((position) => {
                              const key = `${position.positionTitle.toLowerCase()}|${position.vacancyCount}|${position.annualSalaryCve}`;
                              return !existingKeys.has(key);
                            }),
                          ].sort((a, b) => b.annualSalaryCve - a.annualSalaryCve);

                          return (
                            <details
                              key={`base-${row.departmentName}-${row.annualCve}`}
                              className="group"
                            >
                              <summary className="cursor-pointer list-none bg-card px-4 py-4 marker:hidden transition hover:bg-muted/20">
                                <div className="flex items-center justify-between gap-6">
                                  <div className="min-w-0">
                                    <div className="font-medium">{row.departmentName}</div>
                                    <div className="hidden text-xs text-muted-foreground sm:block">
                                      Clique para ver cargos e compensações
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="font-medium">{formatCve(row.annualCve)}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatNumber(row.vacancies)} vagas
                                      </div>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
                                  </div>
                                </div>
                              </summary>

                              <div className="border-t border-border bg-muted/10 px-4 py-3">
                                {mergedPositions.length ? (
                                  <div className="rounded-lg border border-border overflow-x-auto bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Cargo</TableHead>
                                          <TableHead className="hidden md:table-cell">Grupo</TableHead>
                                          <TableHead className="text-right">Vagas</TableHead>
                                          <TableHead className="text-right">Mensal</TableHead>
                                          <TableHead className="hidden text-right md:table-cell">Anual</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {mergedPositions.map((position) => (
                                          <TableRow key={`base-pos-${position.id}`}>
                                            <TableCell>{position.positionTitle}</TableCell>
                                            <TableCell className="hidden text-muted-foreground md:table-cell">
                                              {position.staffGroup ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatNumber(position.vacancyCount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatCve(position.monthlySalaryCve)}
                                            </TableCell>
                                            <TableCell className="hidden text-right md:table-cell">
                                              {formatCve(position.annualSalaryCve)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                                    Sem detalhe de cargos disponível para esta unidade no dataset atual.
                                  </div>
                                )}
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {null}
                </div>
              </SectionBlock>
            ) : null}
               <SectionBlock
              title="Principais projetos"
              description="Projetos agrupados por programa. Clique para abrir o detalhe."
            >
              <div className="space-y-4">
                 <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Montante total alocado</div>
                      <div className="mt-1 text-lg font-semibold sm:text-xl">
                        {formatCve(projectStats.totalAllocatedCve)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Número de projetos</div>
                      <div className="mt-1 text-lg font-semibold sm:text-xl">
                        {formatNumber(projectStats.projectCount)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Maior gasto em projeto</div>
                      <div className="mt-1 text-lg font-semibold sm:text-xl">
                        {projectStats.topProject
                          ? formatCve(projectStats.topProject.amountCve)
                          : "—"}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="divide-y divide-border">
                    {groupedProjects.map((group) => (
                      <details key={group.programName} className="group">
                        <summary className="cursor-pointer list-none bg-card px-4 py-4 marker:hidden transition hover:bg-muted/20">
                          <div className="flex items-center justify-between gap-6">
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
                                  {formatPercent(group.sharePct)}
                                </div>
                              </div>
                              <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
                            </div>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-muted/70">
                          <div
                            className="h-2 rounded-full bg-[#1E78FF]"
                            style={{ width: `${Math.max(group.sharePct, 4)}%` }}
                          />
                          </div>
                        </summary>

                        <div className="border-t border-border bg-muted/10 px-4 py-3">
                          <div className="rounded-lg border border-border overflow-x-auto bg-background">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="hidden md:table-cell">Subprograma</TableHead>
                                  <TableHead>Projeto</TableHead>
                                  <TableHead className="text-right">Montante</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.projects.map((project) => (
                                  <TableRow
                                    key={`${group.programName}-${project.projectName}-${project.amountCve}`}
                                  >
                                    <TableCell className="hidden align-top text-muted-foreground md:table-cell">
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

               
              </div>
            </SectionBlock>

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
                          <div className="mt-2 text-lg font-semibold sm:text-xl">
                            {formatCve(summary.currentRevenueCve)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="text-sm text-muted-foreground">Receita de capital</div>
                          <div className="mt-2 text-lg font-semibold sm:text-xl">
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
                          <div className="mt-2 text-lg font-semibold sm:text-xl">
                            {formatCve(summary.currentExpenseCve)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="text-sm text-muted-foreground">Despesa de capital</div>
                          <div className="mt-2 text-lg font-semibold sm:text-xl">
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
                    colorClassName="bg-[#1E78FF]"
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
                    colorClassName="bg-[#FFB703]"
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
                    colorClassName="bg-[#1E78FF]"
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

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <strong>Fonte:</strong>{" "}
              <a href="/documentos" className="underline underline-offset-4 hover:text-foreground">
                Ver e baixar documentos
              </a>
            </div>
          </>
        )}
      </div>
      <DashboardChatWidget
        context={{ surface: "orcamento", year: Number(year) }}
        storageKey="maioazul-site-chat-budget-v1"
      />
    </div>
  );
}
