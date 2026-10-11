import { Suspense } from "react";
import { Button, Card, Section, SkipLink } from "maio-ui";
import { HeadlineIcon } from "../components/headline-icon";
import { MaioSlideshow } from "../components/maio-slideshow";
import Link from "next/link";
import { NowStrip, NowStripSkeleton } from "../components/now-strip";
import { Header, Footer } from "../components/site-shell";
import { Reveal, HoverCard } from "../components/motion";
import {
  PortalPreview,
  ApiPreview,
  VisitPreview,
  McpPreview,
} from "../components/previews";
import { initiatives, type InitiativeId } from "../lib/content";
import { t, type MessageKey } from "../lib/i18n";
import { localize } from "../lib/locale";
import { currentLocale } from "../lib/request-locale";
import { pageMetadata } from "../lib/seo";

const previews = {
  visit: VisitPreview,
  portal: PortalPreview,
  api: ApiPreview,
  mcp: McpPreview,
};

function initiativeText(id: InitiativeId, field: "name" | "description" | "action", locale: Awaited<ReturnType<typeof currentLocale>>) {
  return t(`initiative.${id}.${field}` as MessageKey, undefined, locale);
}

export async function generateMetadata() {
  const locale = await currentLocale();
  return pageMetadata(
    t("meta.title.home", undefined, locale),
    t("meta.description.home", undefined, locale),
    localize(locale, "/"),
    locale,
  );
}

export default async function Home() {
  const locale = await currentLocale();
  const copy = (key: MessageKey) => t(key, undefined, locale);
  return (
    <>
      <SkipLink href="#conteudo">{copy("skip.content")}</SkipLink>
      <Header />
      <main id="conteudo">
        <Section className="home-hero wrap">
          <Reveal>
            <h1 className="context-headline">
              <span className="headline-line">
                {copy("home.name")} <HeadlineIcon kind="island" locale={locale} /> {copy("home.h1.digital")}
              </span>
              <span className="headline-line">
                {copy("home.h1.knowledge")} <HeadlineIcon kind="data" locale={locale} /> {copy("home.h1.forAll")}
              </span>
            </h1>
            <p className="hero-description">{copy("home.hero")}</p>
            <div className="button-row">
              <Button href="#iniciativas">{copy("home.explore")}</Button>
              <Button href={localize(locale, "/mcp")} variant="light">
                {copy("cta.ask")}
              </Button>
            </div>
          </Reveal>
        </Section>
        <Suspense fallback={<NowStripSkeleton locale={locale} />}>
          <NowStrip locale={locale} />
        </Suspense>
        <Section className="showcase wrap" label={copy("home.showcase")}>
          <Reveal className="showcase-grid">
            <div className="showcase-side">
              <PortalPreview locale={locale} />
            </div>
            <MaioSlideshow locale={locale} />
            <div className="showcase-side">
              <McpPreview locale={locale} />
            </div>
          </Reveal>
          <div className="ecosystem-label">
            <p>
              {copy("home.eco.know")} <i /> {copy("home.eco.research")} <i /> {copy("home.eco.learn")} <i /> {copy("home.eco.build")}
            </p>
          </div>
        </Section>
        <Section className="story-section mission-section wrap" id="sobre">
          <Reveal>
            <h2 className="mission-statement">
              {copy("home.mission.a")} <HeadlineIcon kind="ai" locale={locale} /> {copy("home.mission.b")}{" "}
              <HeadlineIcon kind="map" locale={locale} /> {copy("home.mission.c")}{" "}
              <HeadlineIcon kind="book" locale={locale} /> {copy("home.mission.d")}
            </h2>
          </Reveal>
        </Section>
        <Section className="initiatives-section wrap" id="iniciativas">
          <Reveal className="section-heading">
            <div>
              <h2>
                {copy("home.discover.line1")} <br />
                {copy("home.discover.line2")}
              </h2>
            </div>
            <p>
              {copy("home.discover.text1")} <br />
              {copy("home.discover.text2")}
            </p>
          </Reveal>
          <div className="initiative-grid">
            {initiatives.map((item, i) => {
              const Preview = previews[item.id];
              const href = item.href.startsWith("/") ? localize(locale, item.href) : item.href;
              return (
                <Reveal key={item.id} delay={(i % 2) * 0.08}>
                  <HoverCard href={href} locale={locale} className={`initiative-card initiative-${item.id}`}>
                    <Card>
                      <div className="initiative-visual">
                        <Preview locale={locale} />
                      </div>
                      <div className="initiative-text">
                        <div className="initiative-title">
                          <h3>{initiativeText(item.id, "name", locale)}</h3>
                        </div>
                        <p>{initiativeText(item.id, "description", locale)}</p>
                      </div>
                    </Card>
                  </HoverCard>
                </Reveal>
              );
            })}
          </div>
        </Section>
        <Section className="mcp-feature">
          <div className="wrap mcp-feature-grid">
            <Reveal>
              <h2>
                {copy("home.curiosity.line1")} <br />
                {copy("home.curiosity.line2")}
              </h2>
              <p>{copy("home.curiosity.text")}</p>
              <div className="button-row">
                <Button href={localize(locale, "/chat")} variant="white">
                  {copy("cta.ask")}
                </Button>
                <Link href={localize(locale, "/mcp")} className="feature-link">
                  {copy("home.how")}
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <McpPreview locale={locale} />
            </Reveal>
          </div>
        </Section>
        <Section className="closing wrap">
          <Reveal>
            <h2>
              {copy("home.closing.line1")} <br />
              {copy("home.closing.line2")}
            </h2>
            <div className="button-row">
              <Button href="#iniciativas">{copy("home.tools")}</Button>
              <Button href="https://visitmaio.com" variant="light">
                {copy("home.island")}
              </Button>
            </div>
          </Reveal>
        </Section>
      </main>
      <Footer />
    </>
  );
}
