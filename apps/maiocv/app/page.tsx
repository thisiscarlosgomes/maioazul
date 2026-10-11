import { HeadlineIcon } from "../components/headline-icon";
import { MaioSlideshow } from "../components/maio-slideshow";
import Link from "next/link";
import { Header, Footer } from "../components/site-shell";
import { Reveal, HoverCard } from "../components/motion";
import {
  PortalPreview,
  ApiPreview,
  VisitPreview,
  McpPreview,
} from "../components/previews";
import { initiatives } from "../lib/content";
const previews = {
  visit: VisitPreview,
  portal: PortalPreview,
  api: ApiPreview,
  mcp: McpPreview,
};
export default function Home() {
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Saltar para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <section className="home-hero wrap">
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
              <a href="#iniciativas" className="button">
                Explorar iniciativas
              </a>
              <Link href="/mcp" className="button button-light">
                Perguntar sobre o Maio
              </Link>
            </div>
          </Reveal>
        </section>
        <section
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
        </section>
        <section className="story-section mission-section wrap" id="sobre">
          <Reveal>
            <h2 className="mission-statement">
              Usamos IA <HeadlineIcon kind="ai" /> para criar ferramentas que
              colocam o Maio <HeadlineIcon kind="map" /> ao alcance de todos.
              Para explorar lugares, compreender dados{" "}
              <HeadlineIcon kind="book" />{ " " }e aprender mais sobre a ilha.
            </h2>
          </Reveal>
        </section>
        <section className="initiatives-section wrap" id="iniciativas">
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
                  <HoverCard
                    href={item.href}
                    className={`initiative-card initiative-${item.id}`}
                  >
                    <div className="initiative-visual">
                      <Preview />
                    </div>
                    <div className="initiative-text">
                      <div className="initiative-title">
                        <h3>{item.name}</h3>
                      </div>
                      <p>{item.description}</p>
                    </div>
                  </HoverCard>
                </Reveal>
              );
            })}
          </div>
        </section>
        <section className="mcp-feature">
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
                <a href="/chat" className="button button-white">
                  Ask a question
                </a>
                <Link href="/mcp" className="feature-link">
                  Ver como funciona
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <McpPreview />
            </Reveal>
          </div>
        </section>
        <section className="closing wrap">
          <Reveal>
            <h2>
              O Maio é de todos. <br />O conhecimento também.
            </h2>
            <div className="button-row">
              <a className="button" href="#iniciativas">
                Explorar as ferramentas
              </a>
              <a className="button button-light" href="https://visitmaio.com">
                Conhecer a ilha
              </a>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
