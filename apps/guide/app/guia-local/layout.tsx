import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guia de Boas Práticas para Negócios de Turismo",
  description:
    "Diretrizes práticas para negócios locais de turismo no Maio: legalidade, higiene, preço justo, ruído, espaço público e proteção ambiental.",
  alternates: { canonical: "/guia-local" },
  openGraph: {
    title: "Guia de Boas Práticas para Negócios de Turismo · Visit Maio",
    description:
      "Diretrizes práticas para negócios locais de turismo no Maio.",
    url: "/guia-local",
  },
};

export default function BusinessGuidelinesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
