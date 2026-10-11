import { SkipLink } from "maio-ui";
import { Header, Footer } from "../../components/site-shell";
import { loadEssentials, scheduleSource } from "../../lib/essentials";
import { EMERGENCY, EMERGENCY_VERIFIED_AT, humanContactUrl } from "../../lib/emergency";
import { t, type MessageKey } from "../../lib/i18n";
import { essentialsPath, type Locale } from "../../lib/locale";
import { currentLocale } from "../../lib/request-locale";
import { pageMetadata } from "../../lib/seo";

const emergencyLabel: Record<(typeof EMERGENCY)[number]["id"], MessageKey> = {
  police: "ess.emergency.police",
  hospital: "ess.emergency.hospital",
  medical: "ess.emergency.medical",
};

export async function generateMetadata() {
  const locale = await currentLocale();
  return pageMetadata(t("ess.title", undefined, locale), t("ess.title", undefined, locale), essentialsPath(locale), locale);
}

export default async function EssentialsPage() {
  const locale = await currentLocale();
  const body = await loadEssentials(fetch);
  const contact = humanContactUrl();
  return (
    <>
      <SkipLink href="#conteudo">{t("skip.content", undefined, locale)}</SkipLink>
      <Header />
      <main id="conteudo" className="wrap essentials">
        <h1>{t("ess.title", undefined, locale)}</h1>
        <section aria-labelledby="emergency">
          <h2 id="emergency">{t("ess.emergency", undefined, locale)}</h2>
          <ul className="emergency-list">
            {EMERGENCY.map((item) => (
              <li key={item.id}>
                <a href={item.href} aria-label={`${t(emergencyLabel[item.id], undefined, locale)} ${item.number}`}>
                  <span>{t(emergencyLabel[item.id], undefined, locale)}</span>
                  <span>{item.number}</span>
                </a>
              </li>
            ))}
          </ul>
          <p>{t("ess.verified", { date: EMERGENCY_VERIFIED_AT }, locale)} · MaioAzul</p>
        </section>
        <section aria-labelledby="arrive">
          <h2 id="arrive">{t("ess.arrive", undefined, locale)}</h2>
          <h3>{t("ess.ferry", undefined, locale)}</h3>
          <Provenance locale={locale} envelope={body.ferry} />
          <Schedule locale={locale} sailings={body.ferry.data ?? []} status={body.ferry.status} />
          <p>{t("ess.ferry.confirm", undefined, locale)}</p>
          <h3>{t("ess.flight", undefined, locale)}</h3>
          <Provenance locale={locale} envelope={body.flight} />
          {body.flight.status === "available" ? null : <p>{t("ess.none", undefined, locale)}</p>}
          <p>{t("ess.flight.thirdParty", undefined, locale)}</p>
          <ul>
            {(body.flight.data?.sourceUrls ?? []).map((url) => (
              <li key={url}><a href={url}>{body.flight.source.name}</a></li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="pay">
          <h2 id="pay">{t("ess.pay", undefined, locale)}</h2>
          <p>
            {t("ess.atm", undefined, locale)}{" "}
            {body.payments.data ? body.payments.data.atms.value : t("ess.none", undefined, locale)}
          </p>
          <p>
            {t("ess.pos", undefined, locale)}{" "}
            {body.payments.data ? body.payments.data.pos.value : t("ess.none", undefined, locale)}
          </p>
          {body.payments.data ? <p>{t("ess.pay.source", { year: body.payments.data.atms.year }, locale)}</p> : null}
          <p>{t("ess.pay.cashTip", undefined, locale)}</p>
          <p>{t("ess.pay.venues.empty", undefined, locale)}</p>
          {contact ? <p><a href={contact}>{t("ess.pay.suggest", undefined, locale)}</a></p> : null}
        </section>
      </main>
      <Footer />
    </>
  );
}

function Provenance({
  locale,
  envelope,
}: {
  locale: Locale;
  envelope: { kind: string; source: { name: string }; retrievedAt: string; caveats: string[] };
}) {
  const source = scheduleSource(envelope, locale);
  return (
    <>
      <p>{source.line}</p>
      {source.caveats.map((caveat) => <p key={caveat}>{caveat}</p>)}
    </>
  );
}

function Schedule({ locale, sailings, status }: { locale: Locale; sailings: { from: string; to: string; departure: string; date: string }[]; status: string }) {
  if (!sailings.length) return <p>{t("ess.none", undefined, locale)}</p>;
  return (
    <ul>
      {sailings.map((sailing) => (
        <li key={`${sailing.from}-${sailing.departure}`}>
          <time dateTime={`${sailing.date}T${sailing.departure}:00-01:00`}>{sailing.departure}</time>
          {" "}{sailing.from} → {sailing.to}
        </li>
      ))}
      {status === "partial" ? <li>{t("ess.none", undefined, locale)}</li> : null}
    </ul>
  );
}
