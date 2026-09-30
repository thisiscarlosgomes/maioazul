export type RecebedoriaEntry = {
  recebedoria: string;
  value: number;
};

export type ReceitasYearApi = {
  year: number;
  total: number;
  maio?: number;
  by_recebedoria?: RecebedoriaEntry[];
};

export type ReceitasApiResponse = {
  data?: ReceitasYearApi[];
  source?: string;
  fallback?: boolean;
  updatedAt?: string | null;
};

export type ReceitasYear = {
  year: number;
  total: number;
  byRecebedoria: RecebedoriaEntry[];
};

export type ReceitasSummary = {
  total: number;
  island: number;
  share: number;
  totalYoY: number | null;
  islandYoY: number | null;
};

export type ReceitasTableRow = {
  ilha: string;
  rank: number;
  value: number;
  share: number;
  yoy: number | null;
};

export type ReceitasBenchmark = {
  rank: number;
  totalIslands: number;
  leaderLabel: string;
  leaderValue: number;
  gapToLeaderPct: number | null;
};
