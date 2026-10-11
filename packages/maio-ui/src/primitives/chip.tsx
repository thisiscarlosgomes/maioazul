import type { ReactNode } from "react";

export function Chip({ tone = "source", children }: { tone?: "source" | "estimate"; children: ReactNode }) {
  const classes = tone === "estimate" ? "maio-chip maio-chip-estimate" : "maio-chip";
  return <span className={classes}>{children}</span>;
}
