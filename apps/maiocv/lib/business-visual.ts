import type { Locale } from "./locale";
import { t } from "./i18n.ts";

type BusinessRecord = {
  year?: number;
  indicator?: string;
  value?: number | null;
  sourceId?: string;
  dimensions?: { breakdown?: string; category?: string };
};

export const BUSINESS_DATA_URL =
  "https://api.maio.cv/api/v1/datasets/business-demography/records?limit=100&offset=0";

export function businessMetricProgram(payload: unknown, locale: Locale = "pt"): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as { records?: unknown; numberMatched?: unknown };
  if (!Array.isArray(data.records) || data.numberMatched !== data.records.length) return null;

  const totals = data.records.filter((item): item is BusinessRecord => {
    if (!item || typeof item !== "object") return false;
    const record = item as BusinessRecord;
    return record.indicator === "active-enterprises" &&
      record.dimensions?.breakdown === "total" &&
      record.dimensions.category === "total" &&
      typeof record.year === "number" &&
      typeof record.value === "number" &&
      Number.isFinite(record.value) &&
      record.value >= 0 &&
      record.sourceId === "iae-2024-user-workbook";
  });
  const latest = totals.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0];
  if (!latest) return null;

  const fields = [
    t("openui.business.active", undefined, locale),
    String(Math.round(latest.value!)),
    String(latest.year),
    t("openui.business.source", undefined, locale),
    t("openui.business.caveat", undefined, locale),
  ];
  return `root = BusinessMetric(${fields.map(value => JSON.stringify(value)).join(", ")})`;
}
