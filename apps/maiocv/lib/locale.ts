export const LOCALES = ["pt", "en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const LANG_COOKIE = "maio-lang";

const htmlLang: Record<Locale, string> = { pt: "pt", en: "en", fr: "fr" };
const ogLocale: Record<Locale, string> = { pt: "pt_PT", en: "en_GB", fr: "fr_FR" };
const hreflang: Record<Locale, string> = { pt: "pt-PT", en: "en-GB", fr: "fr-FR" };

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "pt" || value === "en" || value === "fr";
}

export function localeHtmlLang(locale: Locale): string {
  return htmlLang[locale];
}

export function localeOpenGraph(locale: Locale): string {
  return ogLocale[locale];
}

export function localeHreflang(locale: Locale): string {
  return hreflang[locale];
}

export function preferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return "pt";
  for (const part of acceptLanguage.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!tag || tag === "*") continue;
    if (tag.startsWith("pt")) return "pt";
    if (tag.startsWith("fr")) return "fr";
    return "en";
  }
  return "pt";
}

export function localeFromPath(pathname: string): Locale | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  return isLocale(segment) ? segment : null;
}

export function stripLocale(pathname: string): string {
  const locale = localeFromPath(pathname);
  if (!locale) return pathname || "/";
  const rest = pathname.slice(locale.length + 1);
  return rest === "" ? "/" : rest;
}

export const essentialsSlug: Record<Locale, string> = {
  pt: "essenciais",
  en: "essentials",
  fr: "essentiels",
};

export function essentialsPath(locale: Locale): string {
  return `/${locale}/${essentialsSlug[locale]}`;
}

export function switchPath(locale: Locale, pathname: string): string {
  const bare = stripLocale(pathname.split("?")[0] ?? "/").replace(/^\//, "");
  const slugs = Object.values(essentialsSlug);
  if (slugs.includes(bare)) return essentialsPath(locale);
  return localize(locale, pathname);
}

export function localize(locale: Locale, pathname: string): string {
  const bare = stripLocale(pathname.split("?")[0] ?? "/");
  if (bare === "/") return `/${locale}`;
  return `/${locale}${bare.startsWith("/") ? bare : `/${bare}`}`;
}
