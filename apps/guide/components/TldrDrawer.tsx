"use client";

import { Drawer } from "vaul";
import React from "react";

/* =========================
   Types
========================= */

export type InsightGrade = "good" | "neutral" | "warning" | "bad";

export type TldrSection = {
  title: string;
  bullets: string[];
  verdict: string;
  grade: InsightGrade;
};

/* =========================
   Reusable Insight Card
========================= */

function InsightCard({
  label,
  children,
  strong = false,
  grade = "neutral",
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
  grade?: InsightGrade;
}) {
  const base = "rounded-lg border p-4";

  const grades: Record<InsightGrade, string> = {
    good:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
    neutral:
      "border-border bg-muted/50 text-foreground",
    warning:
      "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
    bad:
      "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-100",
  };

  return (
    <div className={`${base} ${grades[grade]}`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
        {label}
      </div>

      <div
        className={[
          "space-y-1 text-sm leading-normal",
          strong ? "font-medium" : "",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

/* =========================
   Drawer
========================= */

export function TldrDrawer({
  open,
  onOpenChange,
  title,
  sections,
  globalVerdict,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  sections: TldrSection[];
  globalVerdict: string;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />

        <Drawer.Content
          className="fixed right-2 top-2 bottom-2 z-50 w-[350px] outline-none flex"
          style={
            {
              "--initial-transform": "calc(100% + 8px)",
            } as React.CSSProperties
          }
        >
          {/* Floating container */}
          <div className="flex h-full w-full flex-col rounded-[16px] bg-background border border-border shadow-lg overflow-hidden">
            
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-border">
              <Drawer.Title className="text-base font-semibold leading-tight">
                {title}
              </Drawer.Title>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-5 pb-6 space-y-6">
              {sections.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Dados insuficientes para gerar leitura rápida.
                </p>
              )}

              {sections.map((section, index) => (
                <div key={index} className="space-y-2">
                  {/* Main narrative */}
                  <InsightCard label={section.title} grade={section.grade}>
                    {section.bullets.map((text, i) => (
                      <p className="mb-0 pb-0"key={i}>{text}</p>
                    ))}
                    <br/>
                    <i>✨ {section.verdict}</i>
                  </InsightCard>

                  {/* Verdict */}
                  {/* <InsightCard
                    label=""
                    strong
                    grade={section.grade}
                  >
                    <p>{section.verdict}</p>
                  </InsightCard> */}
                </div>
              ))}

              {/* Global verdict */}
              {globalVerdict && (
                <InsightCard
                  label="Leitura integrada"
                  strong
                  grade="warning"
                >
                  <p>{globalVerdict}</p>
                </InsightCard>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
