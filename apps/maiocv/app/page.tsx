import { Suspense } from "react";
import { Button, Card, Section, SkipLink } from "maio-ui";
import { HeadlineIcon } from "../components/headline-icon";
import { MaioSlideshow } from "../components/maio-slideshow";
import Link from "next/link";
import { NowStrip, NowStripSkeleton } from "../components/now-strip";
import { Header, Footer, Untranslated } from "../components/site-shell";
import { Reveal, HoverCard } from "../components/motion";
import {
  PortalPreview,
  ApiPreview,
  VisitPreview,
  McpPreview,
} from "../components/previews";
import { initiatives } from "../lib/content";
import { t } from "../lib/i18n";
import { localize } from "../lib/locale";
import { currentLocale } from "../lib/request-locale";
import { pageMetadata } from "../lib/seo";
const previews = {
  visit: VisitPreview,
  portal: PortalPreview,
  api: ApiPreview,
  mcp: McpPreview,
};
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
  return (
    <>
      <SkipLink href="#conteudo">{t("skip.content", undefined, locale)}</SkipLink>
      <Header />
      <main id="conteudo" lang={locale === "pt" ? undefined : "pt"}>
        <Untranslated />
        <Section className="home-hero wrap">
          <Reveal>
            <h1 className="context-headline">
              <span className="headline-line">
                Maio <HeadlineIcon kind="island" /> no digital.
              </span>
              <span className="headline-line">
                Conhecimento <HeadlineIcon kind="data" /> para todos.
              </span>
            </h1>
            <p className="hero-description">
              Usamos inteligência artificial e dados abertos para criar ferramentas digitais para o Maio, Cabo Verde.
              Para conhecer a ilha, investigar e aprender — de onde estiver.
            </p>
            <div className="button-row">
              <Button href="#iniciativas">Explorar iniciativas</Button>
              <Button href={localize(locale, "/mcp")} variant="light">
                Perguntar sobre o Maio
              </Button>
            </div>
          </Reveal>
        </Section>
        <Suspense fallback={<NowStripSkeleton locale={locale} />}>
          <NowStrip locale={locale} />
        </Suspense>
        <Section
          className="showcase wrap"
          aria-label="Uma ilha, várias formas de descobrir"
        >
          <Reveal className="showcase-grid">
            <div className="showcase-side">
              <PortalPreview />
            </div>
            <MaioSlideshow />
            <div className="showcase-side">
              <McpPreview />
            </div>
          </Reveal>
          <div className="ecosystem-label">
            <p>
              conhecer <i /> investigar <i /> aprender <i /> construir
            </p>
          </div>
        </Section>
        <Section className="story-section mission-section wrap" id="sobre">
          <Reveal>
            <h2 className="mission-statement">
              Usamos IA <HeadlineIcon kind="ai" /> para criar ferramentas que
              colocam o Maio <HeadlineIcon kind="map" /> ao alcance de todos.
              Para explorar lugares, compreender dados{" "}
              <HeadlineIcon kind="book" />{ " " }e aprender mais sobre a ilha.
            </h2>
          </Reveal>
        </Section>
        <Section className="initiatives-section wrap" id="iniciativas">
          <Reveal className="section-heading">
            <div>
              <h2>
                O que pode <br />
                descobrir aqui.
              </h2>
            </div>
            <p>
              Para explorar lugares, pesquisar dados <br />e transformar
              perguntas em conhecimento.
            </p>
          </Reveal>
          <div className="initiative-grid">
            {initiatives.map((item, i) => {
              const Preview = previews[item.id as keyof typeof previews];
              return (
                <Reveal key={item.id} delay={(i % 2) * 0.08}>
                  <HoverCard href={item.href} className={`initiative-card initiative-${item.id}`}>
                    <Card>
                      <div className="initiative-visual">
                        <Preview />
                      </div>
                      <div className="initiative-text">
                        <div className="initiative-title">
                          <h3>{item.name}</h3>
                        </div>
                        <p>{item.description}</p>
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
                A curiosidade <br />
                abre a conversa.
              </h2>
              <p>
                A IA também ajuda a explorar a informação. Pergunte sobre o Maio
                nas suas palavras e encontre respostas com base nos dados da
                ilha.
              </p>
              <div className="button-row">
                <Button href={localize(locale, "/chat")} variant="white">
                  {t("cta.ask", undefined, locale)}
                </Button>
                <Link href={localize(locale, "/mcp")} className="feature-link">
                  Ver como funciona
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <McpPreview />
            </Reveal>
          </div>
        </Section>
        <Section className="closing wrap">
          <Reveal>
            <h2>
              O Maio é de todos. <br />O conhecimento também.
            </h2>
            <div className="button-row">
              <Button href="#iniciativas">Explorar as ferramentas</Button>
              <Button href="https://visitmaio.com" variant="light">
                Conhecer a ilha
              </Button>
            </div>
          </Reveal>
        </Section>
      </main>
      <Footer />
    </>
  );
}
