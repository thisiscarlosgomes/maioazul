"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { SectionBlock } from "@/components/dashboard/SectionBlock";
import { KpiGrid, KpiStat } from "@/components/dashboard/KpiStat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ChatUsageStatsResponse = {
  ok: boolean;
  global?: {
    requests_total?: number;
    successful_requests_total?: number;
    rate_limited_requests_total?: number;
    failed_requests_total?: number;
    user_messages_total?: number;
    assistant_messages_total?: number;
    tool_calls_total?: number;
    total_users?: number;
    active_users_24h?: number;
    active_users_48h?: number;
    by_surface?: Record<string, Record<string, number>>;
    lastMessageAt?: string;
  } | null;
  recentDaily?: Array<{
    date?: string;
    requests_total?: number;
    successful_requests_total?: number;
    rate_limited_requests_total?: number;
    failed_requests_total?: number;
    user_messages_total?: number;
    assistant_messages_total?: number;
    tool_calls_total?: number;
  }>;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-PT").format(value);

const formatShortDateTime = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("pt-PT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

function LoadingGrid() {
  return (
    <KpiGrid>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-20" />
        </div>
      ))}
    </KpiGrid>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<ChatUsageStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/chat/stats", { cache: "no-store" });
        const payload = (await res.json()) as ChatUsageStatsResponse;
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setData({ ok: false, global: null, recentDaily: [] });
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
  }, []);

  const global = data?.global;
  const recentDaily = data?.recentDaily ?? [];
  const surfaces = global?.by_surface
    ? Object.entries(global.by_surface).sort((a, b) => {
        const aCount = a[1]?.requests_total ?? 0;
        const bCount = b[1]?.requests_total ?? 0;
        return bCount - aCount;
      })
    : [];

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
                <div>
                  <h1 className="text-xl font-semibold">Admin</h1>
                  <p className="hidden text-sm text-muted-foreground sm:block">
                    Uso agregado do chat e atividade recente.
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
          </div>
        </div>

        <SectionBlock
          title="Resumo do chat"
          description="Totais globais desde que o rastreamento foi ativado."
        >
          {loading ? (
            <LoadingGrid />
          ) : (
            <KpiGrid>
              <KpiStat label="Pedidos totais" value={formatNumber(global?.requests_total ?? 0)} />
              <KpiStat label="Utilizadores" value={formatNumber(global?.total_users ?? 0)} />
              <KpiStat
                label="Utilizadores (48h)"
                value={formatNumber(global?.active_users_48h ?? 0)}
              />
              <KpiStat
                label="Mensagens assistente"
                value={formatNumber(global?.assistant_messages_total ?? 0)}
              />
              <KpiStat
                label="Chamadas de ferramenta"
                value={formatNumber(global?.tool_calls_total ?? 0)}
              />
              <KpiStat
                label="Última mensagem"
                value={formatShortDateTime(global?.lastMessageAt)}
              />
            </KpiGrid>
          )}
        </SectionBlock>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos por dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Sucesso</TableHead>
                      <TableHead className="text-right">Limite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDaily.length ? (
                      recentDaily.map((row) => (
                        <TableRow key={row.date}>
                          <TableCell>{row.date ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.requests_total ?? 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.successful_requests_total ?? 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.rate_limited_requests_total ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Sem atividade registada ainda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Superfícies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Ferramentas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surfaces.length ? (
                      surfaces.map(([surface, stats]) => (
                        <TableRow key={surface}>
                          <TableCell>{surface}</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(stats.requests_total ?? 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(stats.tool_calls_total ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Sem superfícies registadas ainda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
