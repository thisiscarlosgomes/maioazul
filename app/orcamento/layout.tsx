import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orcamento Municipal do Maio",
  description:
    "Receitas, despesas, investimento e enquadramento do orcamento municipal do Maio.",
  alternates: { canonical: "/orcamento" },
  openGraph: {
    title: "Orcamento Municipal do Maio · MaioAzul",
    description:
      "Explore o orcamento municipal do Maio por ano, com receitas, despesas, investimento e principais projetos.",
    url: "/orcamento",
  },
};

export default function OrcamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
