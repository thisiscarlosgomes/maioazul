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

export function mayCacheNavigation(response) {
  return Boolean(response) && response.ok === true && response.redirected === false && response.type === "basic";
}

export function offlineLocale(pathname) {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname === "/fr" || pathname.startsWith("/fr/")) return "fr";
  return "pt";
}

export function formatSavedAt(iso, locale) {
  const tag = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-PT";
  return new Intl.DateTimeFormat(tag, {
    timeZone: "Atlantic/Cape_Verde",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function offlineBanner(pathname, savedAtIso) {
  const locale = offlineLocale(pathname);
  const text = copy[locale];
  const saved = savedAtIso ? `<p>${text.saved.replace("{time}", formatSavedAt(savedAtIso, locale))}</p>` : "";
  return `<div role="status" class="lite-banner" data-maio-offline><p>${text.banner}</p>${saved}<p>${text.stale}</p></div>`;
}
