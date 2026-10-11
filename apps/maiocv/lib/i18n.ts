import en from "./i18n/en.json" with { type: "json" };
import fr from "./i18n/fr.json" with { type: "json" };
import pt from "./i18n/pt.json" with { type: "json" };
import type { Locale } from "./locale";

const catalogs: Record<Locale, Record<keyof typeof pt, string>> = { pt, en, fr };

export type MessageKey = keyof typeof pt;

export function t(
  key: MessageKey,
  values?: Record<string, string | number>,
  locale: Locale = "pt",
): string {
  const template = catalogs[locale][key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : `{${name}}`,
  );
}
