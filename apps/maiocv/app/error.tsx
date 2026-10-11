"use client";

import { useEffect, useState } from "react";
import { EMERGENCY } from "../lib/emergency";
import { t, type MessageKey } from "../lib/i18n";
import { isLocale, type Locale } from "../lib/locale";

const emergencyLabel: Record<(typeof EMERGENCY)[number]["id"], MessageKey> = {
  police: "ess.emergency.police",
  hospital: "ess.emergency.hospital",
  medical: "ess.emergency.medical",
};

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [locale, setLocale] = useState<Locale>("pt");
  useEffect(() => {
    const lang = document.documentElement.lang;
    if (isLocale(lang)) setLocale(lang);
  }, []);
  return (
    <main id="conteudo" className="wrap essentials">
      <h1>{t("error.title", undefined, locale)}</h1>
      <p>{t("error.body", undefined, locale)}</p>
      <button type="button" onClick={() => reset()}>
        {t("error.retry", undefined, locale)}
      </button>
      <h2>{t("ess.emergency", undefined, locale)}</h2>
      <ul className="emergency-list">
        {EMERGENCY.map((item) => (
          <li key={item.id}>
            <a href={item.href}>
              <span>{t(emergencyLabel[item.id], undefined, locale)}</span>
              <span>{item.number}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
