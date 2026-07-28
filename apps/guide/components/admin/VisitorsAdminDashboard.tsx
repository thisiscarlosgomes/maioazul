"use client";

import { useEffect, useMemo, useState } from "react";

type VisitorsResponse = {
  rangeDays: number;
  summary: {
    users: number;
    pageViews: number;
    pagesTracked: number;
  };
  topPages: Array<{
    path: string;
    views: number;
    uniqueUsers: number;
  }>;
  daily: Array<{
    day: string;
    views: number;
    uniqueUsers: number;
  }>;
};

const DAY_OPTIONS = [1, 7, 30] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function VisitorsAdminDashboard() {
  const [days, setDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VisitorsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/visitors?days=${days}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as VisitorsResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const timer = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [days]);

  const totals = useMemo(
    () => ({
      users: data?.summary.users ?? 0,
      pageViews: data?.summary.pageViews ?? 0,
      pagesTracked: data?.summary.pagesTracked ?? 0,
    }),
    [data]
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Visitor tracking powered by first-party events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setDays(option)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                days === option
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground"
              }`}
              type="button"
            >
              {option}d
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Users</div>
          <div className="mt-2 text-3xl font-semibold">{formatNumber(totals.users)}</div>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Page Views</div>
          <div className="mt-2 text-3xl font-semibold">{formatNumber(totals.pageViews)}</div>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Pages</div>
          <div className="mt-2 text-3xl font-semibold">{formatNumber(totals.pagesTracked)}</div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-card p-4">
          <h2 className="text-lg font-medium">Top Pages</h2>
          <div className="mt-3 overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Path</th>
                  <th className="px-3 py-2">Views</th>
                  <th className="px-3 py-2">Users</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topPages ?? []).map((row) => (
                  <tr key={row.path} className="border-t">
                    <td className="max-w-[320px] truncate px-3 py-2 font-mono text-xs">{row.path}</td>
                    <td className="px-3 py-2">{formatNumber(row.views)}</td>
                    <td className="px-3 py-2">{formatNumber(row.uniqueUsers)}</td>
                  </tr>
                ))}
                {!loading && !error && (data?.topPages.length ?? 0) === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-muted-foreground" colSpan={3}>
                      No traffic yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border bg-card p-4">
          <h2 className="text-lg font-medium">Daily Trend</h2>
          <div className="mt-3 space-y-2">
            {(data?.daily ?? []).map((row) => {
              const max = Math.max(...(data?.daily.map((d) => d.views) ?? [1]));
              const width = max > 0 ? Math.max(6, Math.round((row.views / max) * 100)) : 6;
              return (
                <div key={row.day} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{row.day}</span>
                    <span>
                      {formatNumber(row.views)} views · {formatNumber(row.uniqueUsers)} users
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground/80" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
            {!loading && !error && (data?.daily.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No trend data yet.</p>
            ) : null}
          </div>
        </article>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading metrics...</p> : null}
      {error ? <p className="text-sm text-red-600">Error: {error}</p> : null}
    </div>
  );
}
