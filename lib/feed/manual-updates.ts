export type ManualFeedItem = {
  id: string;
  title: string;
  detail?: string;
  source?: string;
  updatedAt: string;
  href: string;
  tone: "data" | "place" | "system";
};

// Manual feed entries. Add new items here when updates are provided.
export const MANUAL_FEED_UPDATES: ManualFeedItem[] = [
  {
    id: "manual-2026-03-06-programa-sustentabilidade-energetica-maio",
    title: "Dados da Sustentabilidade Energética",
    detail: "Atualização manual",
    source: "manual",
    updatedAt: "2026-03-06T09:00:00+08:00",
    href: "/orcamento",
    tone: "data",
  },
  {
    id: "manual-2026-03-05-quadro-pessoal-2025",
    title: "Quadro de pessoal da Câmara Municipal para o ano 2025",
    detail: "Atualização manual",
    source: "manual",
    updatedAt: "2026-03-05T09:00:00+08:00",
    href: "/orcamento",
    tone: "data",
  },
  {
    id: "manual-2026-03-04-orcamento-2026",
    title: "Orçamento Municipal do Maio para 2026",
    detail: "Atualização manual",
    source: "manual",
    updatedAt: "2026-03-04T09:00:00+08:00",
    href: "/orcamento",
    tone: "data",
  },
];
