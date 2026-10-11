"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "../lib/i18n";
import { LOCALES, switchPath, type Locale } from "../lib/locale";

const ownName: Record<Locale, "lang.pt" | "lang.en" | "lang.fr"> = {
  pt: "lang.pt",
  en: "lang.en",
  fr: "lang.fr",
};

export function LangSwitch({ locale, path }: { locale: Locale; path: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [extra, setExtra] = useState("");
  useEffect(() => {
    setExtra(window.location.search + window.location.hash);
  }, [path]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") menu.current?.removeAttribute("open");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      <details className="lang-switch-menu" ref={menu}>
        <summary aria-label={`${locale.toUpperCase()}, ${t("lang.switch.label", undefined, locale)}`}>
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
