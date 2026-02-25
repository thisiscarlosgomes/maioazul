"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/lang";
import EsimCheckoutPanel from "@/components/EsimCheckoutPanel";

export default function EsimServicePage() {
  const [lang] = useLang();

  const copy = useMemo(
    () => ({
      pt: {
        title: "Comprar eSIM Cabo Verde",
      },
      en: {
        title: "Buy Cabo Verde eSIM",
      },
    }),
    []
  );

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/map"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
          aria-label={lang === "pt" ? "Voltar" : "Back"}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold sm:text-2xl">{copy[lang].title}</h1>
        <div className="w-10" />
      </div>

      <EsimCheckoutPanel />
    </div>
  );
}
