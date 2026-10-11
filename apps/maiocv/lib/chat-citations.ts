export type Citation = { name: string; href?: string; kind?: string };

export function citationsFrom(payload: unknown): Citation[] {
  if (!payload || typeof payload !== "object") return [];
  const raw = (payload as { citations?: unknown }).citations;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as { name?: unknown; href?: unknown; kind?: unknown };
    if (typeof record.name !== "string" || !record.name.trim()) return [];
    return [{
      name: record.name,
      href: typeof record.href === "string" ? record.href : undefined,
      kind: typeof record.kind === "string" ? record.kind : undefined,
    }];
  });
}

export function isUncited(payload: unknown): boolean {
  return citationsFrom(payload).length === 0;
}
