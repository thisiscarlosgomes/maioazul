"use client";

import { useEffect, useState } from "react";

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

type FeedbackEntry = {
  category?: string;
  feedback?: string;
  satisfaction?: string;
  sourcePath?: string;
  createdAt?: string;
};

type FeedbackResponse = {
  ok: boolean;
  entries?: FeedbackEntry[];
};

type VisitorStatsResponse = {
  ok: boolean;
  global?: {
    total_pageviews?: number;
    pageviews_7d?: number;
    unique_visitors_total?: number;
    unique_visitors_7d?: number;
    last_visit_at?: string | null;
  } | null;
  recentDaily?: Array<{
    date?: string;
    pageviews?: number;
    unique_visitors?: number;
  }>;
  topPages?: Array<{
    path?: string;
    pageviews?: number;
    unique_visitors?: number;
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

const formatCategory = (value: string | null | undefined) => {
  if (!value) return "—";
  if (value === "sugestoes") return "Sugestões";
  if (value === "experiencia") return "Experiência";
  if (value === "bugs") return "Bugs";
  return value;
};

const formatSatisfaction = (value: string | null | undefined) => {
  if (!value) return "—";
  if (value === "very_bad") return "Muito insatisfeito";
  if (value === "bad") return "Insatisfeito";
  if (value === "ok") return "Neutro";
  if (value === "great") return "Muito satisfeito";
  return value;
};

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
  const [visitorData, setVisitorData] = useState<VisitorStatsResponse | null>(null);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, feedbackRes, visitorRes] = await Promise.all([
          fetch("/api/chat/stats", { cache: "no-store" }),
          fetch("/api/feedback?limit=100", { cache: "no-store" }),
          fetch("/api/visitors/stats", { cache: "no-store" }),
        ]);
        const payload = (await statsRes.json()) as ChatUsageStatsResponse;
        const feedbackPayload = (await feedbackRes.json()) as FeedbackResponse;
        const visitorPayload = (await visitorRes.json()) as VisitorStatsResponse;
        if (!cancelled) {
          setData(payload);
          setFeedbackEntries(feedbackPayload.entries ?? []);
          setVisitorData(visitorPayload);
        }
      } catch {
        if (!cancelled) {
          setData({ ok: false, global: null, recentDaily: [] });
          setVisitorData({ ok: false, global: null, recentDaily: [], topPages: [] });
          setFeedbackEntries([]);
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
  const visitorsGlobal = visitorData?.global;
  const visitorsRecentDaily = visitorData?.recentDaily ?? [];
  const topPages = visitorData?.topPages ?? [];

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
                label="Mensagens assistente"
                value={formatNumber(global?.assistant_messages_total ?? 0)}
              />
              <KpiStat
                label="Chamadas de ferramenta"
                value={formatNumber(global?.tool_calls_total ?? 0)}
              />
            </KpiGrid>
          )}
        </SectionBlock>

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

        <SectionBlock
          title="Visitantes"
          description="Tráfego agregado do site com visitantes únicos e pageviews."
        >
          {loading ? (
            <LoadingGrid />
          ) : (
            <KpiGrid>
              <KpiStat
                label="Visitantes únicos (total)"
                value={formatNumber(visitorsGlobal?.unique_visitors_total ?? 0)}
              />
              <KpiStat
                label="Visitantes únicos (7d)"
                value={formatNumber(visitorsGlobal?.unique_visitors_7d ?? 0)}
              />
              <KpiStat
                label="Pageviews (total)"
                value={formatNumber(visitorsGlobal?.total_pageviews ?? 0)}
              />
              <KpiStat
                label="Pageviews (7d)"
                value={formatNumber(visitorsGlobal?.pageviews_7d ?? 0)}
              />
              <KpiStat
                label="Última visita"
                value={formatShortDateTime(visitorsGlobal?.last_visit_at)}
              />
            </KpiGrid>
          )}
        </SectionBlock>

        <Card>
          <CardHeader>
            <CardTitle>Visitantes por dia (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Visitantes únicos</TableHead>
                    <TableHead className="text-right">Pageviews</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitorsRecentDaily.length ? (
                    visitorsRecentDaily.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(row.unique_visitors ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(row.pageviews ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Sem visitas registadas ainda.
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
            <CardTitle>Páginas mais visitadas (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Página</TableHead>
                    <TableHead className="text-right">Visitantes únicos</TableHead>
                    <TableHead className="text-right">Pageviews</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.length ? (
                    topPages.map((row, index) => (
                      <TableRow key={`${row.path ?? "unknown"}-${index}`}>
                        <TableCell>{row.path || "—"}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(row.unique_visitors ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(row.pageviews ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Sem dados suficientes ainda.
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
            <CardTitle>Feedback recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Satisfação</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackEntries.length ? (
                    feedbackEntries.map((entry, index) => (
                      <TableRow key={`${entry.createdAt ?? "unknown"}-${index}`}>
                        <TableCell>{formatShortDateTime(entry.createdAt)}</TableCell>
                        <TableCell>{formatCategory(entry.category)}</TableCell>
                        <TableCell>{formatSatisfaction(entry.satisfaction)}</TableCell>
                        <TableCell>{entry.sourcePath || "—"}</TableCell>
                        <TableCell className="min-w-[320px] whitespace-pre-wrap break-words">
                          {entry.feedback || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Sem feedback registado ainda.
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
  );
}
