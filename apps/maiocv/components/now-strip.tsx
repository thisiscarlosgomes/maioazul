import { loadAgora } from "../lib/agora";
import { t } from "../lib/i18n";
import type { Locale } from "../lib/locale";
import { nowCards } from "../lib/now-view";

export async function NowStrip({ locale }: { locale: Locale }) {
  const body = await loadAgora(fetch);
  const cards = nowCards(body, locale);
  return (
    <section className="now-strip wrap" aria-labelledby="maio-agora">
      <div className="now-strip-head">
        <h2 id="maio-agora">{t("agora.title", undefined, locale)}</h2>
        <p>{t("agora.tz", undefined, locale)}</p>
      </div>
      <div className="now-strip-row" role="group" aria-label={t("agora.title", undefined, locale)} tabIndex={0}>
        {cards.map((card) => (
          <dl key={card.id} className="now-card">
            <dt>{card.label}</dt>
            <dd className="now-card-value">{card.primary}</dd>
            {card.secondary ? <dd>{card.secondary}</dd> : null}
            <dd className="now-card-source">{card.source}</dd>
          </dl>
        ))}
      </div>
    </section>
  );
}
