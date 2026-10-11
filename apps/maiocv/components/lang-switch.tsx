"use client";

import { useEffect, useState } from "react";
import { t } from "../lib/i18n";
import { LOCALES, switchPath, type Locale } from "../lib/locale";

const ownName: Record<Locale, "lang.pt" | "lang.en" | "lang.fr"> = {
  pt: "lang.pt",
  en: "lang.en",
  fr: "lang.fr",
};

export function LangSwitch({ locale, path }: { locale: Locale; path: string }) {
  const [extra, setExtra] = useState("");
  useEffect(() => {
    const search = path.includes("?") ? "" : window.location.search;
    setExtra(search + window.location.hash);
  }, [path]);

  const links = LOCALES.map((code) => ({
    code,
    href: `${switchPath(code, path)}${extra}`,
    label: t(ownName[code], undefined, code),
  }));

  return (
    <>
      <nav className="lang-switch-segmented" aria-label={t("lang.switch.label", undefined, locale)}>
        {links.map((link) => (
          <a
            key={link.code}
            href={link.href}
            hrefLang={link.code}
            lang={link.code}
            aria-current={link.code === locale ? "true" : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>
      <details className="lang-switch-menu">
        <summary aria-label={t("lang.current", { lang: t(ownName[locale], undefined, locale) }, locale)}>
          {locale.toUpperCase()}
        </summary>
        <div role="group" aria-label={t("lang.switch.label", undefined, locale)}>
          {links.map((link) => (
            <a
              key={link.code}
              href={link.href}
              hrefLang={link.code}
              lang={link.code}
              aria-current={link.code === locale ? "true" : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>
      </details>
    </>
  );
}
