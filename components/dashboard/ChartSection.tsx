import { ReactNode } from "react";

export function ChartSection({
  title,
  description,
  children,
  insight,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  insight?: string;
}) {
  return (
    <section className="space-y-2">
      <div className="space-y-1">
        <h2 className="font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {children}
      </div>

      {insight && (
        <p className="text-sm text-muted-foreground italic">{insight}</p>
      )}
    </section>
  );
}
