import type {
  ReceitasBenchmark,
  RecebedoriaEntry,
  ReceitasApiResponse,
  ReceitasSummary,
  ReceitasTableRow,
  ReceitasYear,
} from "@/lib/dashboard/types";

export const ISLAND_RECEBEDORIAS = new Set([
  "Boa Vista",
  "Brava",
  "Fogo",
  "Maio",
  "Sal",
  "Santiago",
  "Santo Antão",
  "São Nicolau",
  "São Vicente",
]);

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function normalizeReceitasYears(
  payload: ReceitasApiResponse | null | undefined
): ReceitasYear[] {
  return (payload?.data || [])
    .map((item) => ({
      year: Number(item.year),
      total: Number(item.total || 0),
      byRecebedoria: Array.isArray(item.by_recebedoria)
        ? item.by_recebedoria.map((r) => ({
            recebedoria: String(r.recebedoria || ""),
            value: Number(r.value || 0),
          }))
        : [],
    }))
    .sort((a, b) => a.year - b.year);
}

export function findReceitasYear(
  years: ReceitasYear[],
  year: string
): ReceitasYear | undefined {
  return years.find((r) => String(r.year) === year);
}

export function getIslandValue(yearData: ReceitasYear, islandLabel: string): number {
  return (
    yearData.byRecebedoria.find(
      (r) => normalizeText(r.recebedoria) === normalizeText(islandLabel)
    )?.value ?? 0
  );
}

function sortAllIslands(rows: RecebedoriaEntry[]) {
  return [
    ...rows.filter((r) => normalizeText(r.recebedoria) === normalizeText("Maio")),
    ...rows
      .filter((r) => normalizeText(r.recebedoria) !== normalizeText("Maio"))
      .sort((a, b) => b.value - a.value),
  ];
}

function computeYoY(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function buildReceitasSummary(
  currentYear: ReceitasYear,
  previousYear: ReceitasYear | undefined,
  islandLabel: string
): ReceitasSummary {
  const island = getIslandValue(currentYear, islandLabel);
  const previousIsland = previousYear ? getIslandValue(previousYear, islandLabel) : 0;

  return {
    total: currentYear.total,
    island,
    share: currentYear.total > 0 ? (island / currentYear.total) * 100 : 0,
    totalYoY: previousYear ? computeYoY(currentYear.total, previousYear.total) : null,
    islandYoY: previousYear ? computeYoY(island, previousIsland) : null,
  };
}

export function buildReceitasTableRows(
  currentYear: ReceitasYear,
  previousYear: ReceitasYear | undefined,
  ilha: string,
  allIslandsLabel: string
): ReceitasTableRow[] {
  const islandRows = currentYear.byRecebedoria.filter((r) =>
    ISLAND_RECEBEDORIAS.has(r.recebedoria)
  );
  const rankedByContribution = islandRows
    .slice()
    .sort((a, b) => b.value - a.value);
  const rankMap = new Map(
    rankedByContribution.map((r, index) => [normalizeText(r.recebedoria), index + 1])
  );

  const filtered =
    ilha === allIslandsLabel
      ? sortAllIslands(islandRows)
      : islandRows.filter(
          (r) => normalizeText(r.recebedoria) === normalizeText(ilha)
        );

  return filtered.map((r) => {
    const previousValue =
      previousYear?.byRecebedoria.find(
        (p) => normalizeText(p.recebedoria) === normalizeText(r.recebedoria)
      )?.value ?? 0;

    return {
      ilha: r.recebedoria,
      rank: rankMap.get(normalizeText(r.recebedoria)) ?? 0,
      value: r.value,
      share: currentYear.total > 0 ? (r.value / currentYear.total) * 100 : 0,
      yoy: previousYear ? computeYoY(r.value, previousValue) : null,
    };
  });
}

export function buildReceitasBenchmark(
  currentYear: ReceitasYear,
  islandLabel: string
): ReceitasBenchmark {
  const ranked = currentYear.byRecebedoria
    .filter((r) => ISLAND_RECEBEDORIAS.has(r.recebedoria))
    .slice()
    .sort((a, b) => b.value - a.value);

  const target = ranked.find(
    (r) => normalizeText(r.recebedoria) === normalizeText(islandLabel)
  );
  const leader = ranked[0];

  if (!target || !leader) {
    return {
      rank: 0,
      totalIslands: ranked.length,
      leaderLabel: "—",
      leaderValue: 0,
      gapToLeaderPct: null,
    };
  }

  const gapToLeaderPct =
    leader.value > 0 ? ((leader.value - target.value) / leader.value) * 100 : null;

  return {
    rank: ranked.findIndex((r) => r.recebedoria === target.recebedoria) + 1,
    totalIslands: ranked.length,
    leaderLabel: leader.recebedoria,
    leaderValue: leader.value,
    gapToLeaderPct,
  };
}
