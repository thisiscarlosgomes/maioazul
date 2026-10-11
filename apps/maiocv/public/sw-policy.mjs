const copy = {
  en: {
    banner: "You are offline. Showing saved information.",
    saved: "Saved {time}",
    stale: "Schedules may have changed — confirm online.",
  },
  fr: {
    banner: "Vous êtes hors ligne. Informations enregistrées affichées.",
    saved: "Enregistré {time}",
    stale: "Les horaires ont pu changer — vérifiez en ligne.",
  },
  pt: {
    banner: "Está offline. A mostrar informação guardada.",
    saved: "Guardado {time}",
    stale: "Os horários podem ter mudado — confirme online.",
  },
};

export const NAVIGATION_CACHE_LIMIT = 8;

export function mayCacheNavigation(response) {
  return Boolean(response) && response.ok === true && response.redirected === false && response.type === "basic";
}

export function isSearchQuery(url) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  const searchPage = path === "/search" || path.endsWith("/search");
  return searchPage && url.searchParams.has("q");
}

export function mayStoreNavigation(url, response) {
  return mayCacheNavigation(response) && !isSearchQuery(url);
}

export function evictionUrls(requestUrls, limit, pinned) {
  const keep = new Set(pinned);
  const evictable = requestUrls.filter((url) => {
    const parsed = new URL(url);
    if (parsed.search) return true;
    return !keep.has(parsed.pathname);
  });
  const overflow = evictable.length - limit;
  return overflow > 0 ? evictable.slice(0, overflow) : [];
}

export function offlineLocale(pathname) {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname === "/fr" || pathname.startsWith("/fr/")) return "fr";
  return "pt";
}

function maioDay(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Atlantic/Cape_Verde",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatSavedAt(iso, locale, now = new Date()) {
  const tag = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-PT";
  const saved = new Date(iso);
  const time = new Intl.DateTimeFormat(tag, {
    timeZone: "Atlantic/Cape_Verde",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(saved);
  if (maioDay(saved) === maioDay(now)) return time;
  const date = new Intl.DateTimeFormat(tag, {
    timeZone: "Atlantic/Cape_Verde",
    day: "numeric",
    month: "short",
  }).format(saved);
  return `${date} ${time}`;
}

export function offlineBanner(pathname, savedAtIso, now = new Date()) {
  const locale = offlineLocale(pathname);
  const text = copy[locale];
  const saved = savedAtIso ? `<p>${text.saved.replace("{time}", formatSavedAt(savedAtIso, locale, now))}</p>` : "";
  return `<div role="status" class="lite-banner" data-maio-offline><p>${text.banner}</p>${saved}<p>${text.stale}</p></div>`;
}
