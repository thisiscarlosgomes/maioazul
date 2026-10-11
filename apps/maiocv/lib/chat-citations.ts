export type Citation = { name: string; href?: string; kind?: string };

export function declaredCitations(payload: unknown): Citation[] | null {
  if (!payload || typeof payload !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(payload, "citations")) return null;
  const raw = (payload as { citations?: unknown }).citations;
  if (!Array.isArray(raw)) return null;
  return citationsFromList(raw);
}

export function citationsFrom(payload: unknown): Citation[] {
  return declaredCitations(payload) ?? [];
}

function citationsFromList(raw: unknown[]): Citation[] {
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
  const declared = declaredCitations(payload);
  return declared !== null && declared.length === 0;
}
