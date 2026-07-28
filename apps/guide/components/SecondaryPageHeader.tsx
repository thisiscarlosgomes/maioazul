"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/lang";

type HeaderTitle = string | { en: string; pt: string };

export default function SecondaryPageHeader({
  title,
  backHref = "/map",
  backLabel,
}: {
  title: HeaderTitle;
  backHref?: string;
  backLabel?: string;
}) {
  const [lang] = useLang();

  const resolvedTitle =
    typeof title === "string" ? title : title[lang] ?? title.en ?? title.pt;
  const resolvedBackLabel = backLabel || (lang === "pt" ? "Voltar" : "Back");

  return (
    <div className="sticky inset-x-0 top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={backHref}
            aria-label={resolvedBackLabel}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm hover:bg-accent active:scale-[0.95]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="truncate text-base font-semibold text-foreground">
            {resolvedTitle}
          </div>
        </div>
      </div>
    </div>
  );
}
