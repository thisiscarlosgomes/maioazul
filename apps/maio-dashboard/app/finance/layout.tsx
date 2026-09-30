import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Financas Externas | Maio Azul",
  description:
    "Remessas de emigrantes e Investimento Direto Estrangeiro em Cabo Verde, com base nos quadros do Banco de Cabo Verde.",
  alternates: { canonical: "/finance" },
  openGraph: {
    title: "Financas Externas | Maio Azul",
    description:
      "Remessas de emigrantes e Investimento Direto Estrangeiro em Cabo Verde.",
    url: "/finance",
    type: "website",
  },
};

export default function FinanceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
