type PopulationRecord = {
  year?: unknown;
  geographicScope?: unknown;
  indicator?: unknown;
  value?: unknown;
};

export const POPULATION_DATA_URL = "https://api.maio.cv/api/v1/datasets/population/records?limit=100";

export function isPopulationTotalQuestion(question: string): boolean {
  const normalized = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(populacao|population|habitantes)\b|quantas pessoas vivem/.test(normalized) &&
    !/\b(compar\w*|evolu\w*|cresci\w*|densidade|localidade|aldeia|cidade|concelho|versus|vs)\b/.test(normalized) &&
    (normalized.includes("maio") || !/\b(cabo verde|sal|boa vista|santiago|fogo|brava|sao vicente|santo antao|sao nicolau)\b/.test(normalized));
}

export function populationAnswer(payload: unknown, question: string): string | null {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { records?: unknown }).records)) return null;
  const records = (payload as { records: PopulationRecord[] }).records
    .filter(record => record.geographicScope === "island:maio" && record.indicator === "resident-population" &&
      Number.isInteger(record.year) && typeof record.value === "number" && Number.isFinite(record.value) && record.value > 0)
    .sort((a, b) => Number(b.year) - Number(a.year));
  const latest = records[0];
  if (!latest) return null;
  const requestedYear = question.match(/\b(?:19|20)\d{2}\b/)?.[0];
  const exact = requestedYear ? records.find(record => record.year === Number(requestedYear)) : latest;
  const format = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (!exact) return `Não encontrei um valor publicado para ${requestedYear}. O registo mais recente disponível para a ilha do Maio é de ${format(latest.value as number)} residentes em ${latest.year}. A base atribui-o ao INE Cabo Verde, mas não indica a tabela publicada nem se é censo ou estimativa; confirme a fonte antes de citar o número.`;
  return `O registo disponível para a ilha do Maio indica ${format(exact.value as number)} residentes em ${exact.year}. A base atribui-o ao INE Cabo Verde, mas não indica a tabela publicada nem se é censo ou estimativa; confirme a fonte antes de citar o número.`;
}
