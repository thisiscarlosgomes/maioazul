import { EMERGENCY } from "../lib/emergency";
import { t, type MessageKey } from "../lib/i18n";
import type { Locale } from "../lib/locale";

const labels: Record<(typeof EMERGENCY)[number]["id"], MessageKey> = {
  police: "ess.emergency.police",
  hospital: "ess.emergency.hospital",
  medical: "ess.emergency.medical",
};

export function ContactSlot({ locale, contactUrl }: { locale: Locale; contactUrl: string }) {
  return (
    <div className="contact-slot">
      <p>{t("chat.emergency", undefined, locale)}</p>
      <ul>
        {EMERGENCY.map((item) => (
          <li key={item.id}>
            <a href={item.href}>{t(labels[item.id], undefined, locale)} {item.number}</a>
          </li>
        ))}
      </ul>
      {contactUrl ? (
        <p>
          <a href={contactUrl} target="_blank" rel="noopener noreferrer">
            {t("chat.human", undefined, locale)} · Instagram @maio__azul
          </a>
        </p>
      ) : null}
    </div>
  );
}
