"use client";

import { type FormEvent, useEffect, useState } from "react";

import { SectionBlock } from "@/components/dashboard/SectionBlock";
import { KpiGrid, KpiStat } from "@/components/dashboard/KpiStat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: "draft" | "approved" | "published";
  year: number | null;
  sourceDataset: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type BlogAdminResponse = {
  ok: boolean;
  items?: BlogPost[];
};

type AdminAuthSessionResponse = {
  ok: boolean;
  configured?: boolean;
  authenticated?: boolean;
  error?: string;
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
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogActionId, setBlogActionId] = useState<string | null>(null);
  const [generatingBlogs, setGeneratingBlogs] = useState(false);
  const [blogDraftsMessage, setBlogDraftsMessage] = useState<string | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [blogPrompt, setBlogPrompt] = useState("");
  const [blogPromptMaxPosts, setBlogPromptMaxPosts] = useState(3);
  const [authChecked, setAuthChecked] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, feedbackRes, visitorRes, blogRes] = await Promise.all([
        fetch("/api/chat/stats", { cache: "no-store" }),
        fetch("/api/feedback?limit=100", { cache: "no-store" }),
        fetch("/api/visitors/stats", { cache: "no-store" }),
        fetch("/api/blog/admin", { cache: "no-store" }),
      ]);

      if ([statsRes, feedbackRes, visitorRes, blogRes].some((res) => res.status === 401)) {
        setAuthenticated(false);
        setAuthError("Sessão expirada. Inicie sessão novamente.");
        return;
      }

      const payload = (await statsRes.json()) as ChatUsageStatsResponse;
      const feedbackPayload = (await feedbackRes.json()) as FeedbackResponse;
      const visitorPayload = (await visitorRes.json()) as VisitorStatsResponse;
      const blogPayload = (await blogRes.json()) as BlogAdminResponse;
      setData(payload);
      setFeedbackEntries(feedbackPayload.entries ?? []);
      setVisitorData(visitorPayload);
      setBlogPosts(blogPayload.items ?? []);
    } catch {
      setData({ ok: false, global: null, recentDaily: [] });
      setVisitorData({ ok: false, global: null, recentDaily: [], topPages: [] });
      setFeedbackEntries([]);
      setBlogPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/admin/auth", { cache: "no-store" });
        const payload = (await res.json()) as AdminAuthSessionResponse;
        const isConfigured = Boolean(payload.configured);
        const isAuthenticated = Boolean(payload.authenticated);
        setAuthConfigured(isConfigured);
        setAuthenticated(isAuthenticated);
        setAuthChecked(true);
        if (isConfigured && isAuthenticated) {
          await loadAdminData();
        } else {
          setLoading(false);
        }
      } catch {
        setAuthConfigured(false);
        setAuthenticated(false);
        setAuthChecked(true);
        setLoading(false);
      }
    }

    void checkSession();
  }, []);

  const global = data?.global;
  const recentDaily = data?.recentDaily ?? [];
  const visitorsGlobal = visitorData?.global;
  const visitorsRecentDaily = visitorData?.recentDaily ?? [];
  const topPages = visitorData?.topPages ?? [];

  const runBlogAction = async (
    id: string,
    action: "approve" | "publish" | "move_to_draft" | "discard"
  ) => {
    try {
      setBlogActionId(id);
      const res = await fetch("/api/blog/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) return;
      const refresh = await fetch("/api/blog/admin", { cache: "no-store" });
      const payload = (await refresh.json()) as BlogAdminResponse;
      setBlogPosts(payload.items ?? []);
    } finally {
      setBlogActionId(null);
    }
  };

  const generateDrafts = async (prompt?: string, maxPosts?: number) => {
    try {
      setGeneratingBlogs(true);
      setBlogDraftsMessage(null);
      const res = await fetch("/api/blog/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          prompt && prompt.trim()
            ? JSON.stringify({
                prompt: prompt.trim(),
                maxPosts: Math.max(1, Math.min(10, Math.floor(maxPosts ?? 3))),
              })
            : undefined,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setBlogDraftsMessage(payload.error ?? "Falha ao gerar drafts.");
        return;
      }
      const generationPayload = (await res.json().catch(() => ({}))) as {
        created?: number;
        candidateMetrics?: number;
        generated?: number;
      };
      const refresh = await fetch("/api/blog/admin", { cache: "no-store" });
      const payload = (await refresh.json()) as BlogAdminResponse;
      setBlogPosts(payload.items ?? []);
      setBlogDraftsMessage(
        `Geração concluída: ${generationPayload.created ?? 0} drafts criados de ${
          generationPayload.generated ?? generationPayload.candidateMetrics ?? 0
        } pedidos.`
      );
    } catch {
      setBlogDraftsMessage("Erro inesperado ao gerar drafts.");
    } finally {
      setGeneratingBlogs(false);
    }
  };

  const submitPromptGeneration = async () => {
    if (!blogPrompt.trim()) {
      setBlogDraftsMessage("Descreva o que pretende gerar antes de continuar.");
      return;
    }
    await generateDrafts(blogPrompt, blogPromptMaxPosts);
    setIsGenerateDialogOpen(false);
    setBlogPrompt("");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await res.json()) as AdminAuthSessionResponse;
      if (!res.ok || !payload.ok) {
        setAuthError(payload.error ?? "Password inválida.");
        return;
      }
      setAuthenticated(true);
      setPassword("");
      await loadAdminData();
    } catch {
      setAuthError("Não foi possível autenticar.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
    setData(null);
    setVisitorData(null);
    setFeedbackEntries([]);
    setBlogPosts([]);
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">A carregar painel de administração...</p>
        </div>
      </div>
    );
  }

  if (!authConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-2 rounded-xl border border-border bg-card p-5">
          <h1 className="text-base font-semibold">Admin bloqueado</h1>
          <p className="text-sm text-muted-foreground">
            Configure `ADMIN_PASSWORD` (e opcionalmente `ADMIN_SESSION_SECRET`) no ambiente.
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-5">
          <h1 className="text-base font-semibold">Admin Login</h1>
          <p className="text-sm text-muted-foreground">Introduza a password de administração.</p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
            placeholder="Password"
            required
          />
          {authError ? <p className="text-sm text-red-500">{authError}</p> : null}
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    );
  }

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
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
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
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Artigos gerados por IA</CardTitle>
              <Button
                size="sm"
                disabled={generatingBlogs}
                onClick={() => setIsGenerateDialogOpen(true)}
              >
                {generatingBlogs ? "A gerar..." : "Gerar com prompt"}
              </Button>
            </div>
            {blogDraftsMessage ? (
              <p className="text-xs text-muted-foreground mt-2">{blogDraftsMessage}</p>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogPosts.length ? (
                    blogPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>{formatShortDateTime(post.updatedAt)}</TableCell>
                        <TableCell className="min-w-[280px]">
                          <div className="font-medium">{post.title}</div>
                          <div className="text-xs text-muted-foreground">{post.slug}</div>
                        </TableCell>
                        <TableCell>{post.status}</TableCell>
                        <TableCell>{post.year ?? "—"}</TableCell>
                        <TableCell>{post.sourceDataset}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {post.status !== "approved" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={blogActionId === post.id}
                                onClick={() => runBlogAction(post.id, "approve")}
                              >
                                Aprovar
                              </Button>
                            ) : null}
                            {post.status !== "published" ? (
                              <Button
                                size="sm"
                                disabled={blogActionId === post.id}
                                onClick={() => runBlogAction(post.id, "publish")}
                              >
                                Publicar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={blogActionId === post.id}
                                onClick={() => runBlogAction(post.id, "move_to_draft")}
                              >
                                Voltar a draft
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={blogActionId === post.id}
                              onClick={() => runBlogAction(post.id, "discard")}
                            >
                              Descartar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Sem artigos gerados ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar drafts com prompt</DialogTitle>
              <DialogDescription>
                Descreva em linguagem natural os artigos que quer criar. Exemplo: "Cria 2
                destaques sobre acesso a água e internet, com foco em impacto social."
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <textarea
                value={blogPrompt}
                onChange={(event) => setBlogPrompt(event.target.value)}
                placeholder="Que tipo de conteúdos devo criar?"
                className="w-full min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
              />
              <div className="space-y-1">
                <label htmlFor="blog-max-posts" className="text-xs text-muted-foreground">
                  Número máximo de drafts
                </label>
                <input
                  id="blog-max-posts"
                  type="number"
                  min={1}
                  max={10}
                  value={blogPromptMaxPosts}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    setBlogPromptMaxPosts(Number.isFinite(parsed) ? parsed : 3);
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={generatingBlogs} onClick={submitPromptGeneration}>
                {generatingBlogs ? "A gerar..." : "Gerar drafts"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
