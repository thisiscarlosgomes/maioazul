import { Button, Section, SkipLink } from "maio-ui";
import { HeadlineIcon } from "../../components/headline-icon";
import { pageMetadata } from "../../lib/seo";
import { Header, Footer, Untranslated } from "../../components/site-shell";
import { Reveal } from "../../components/motion";
import { McpDemo } from "../../components/mcp-demo";
import { t } from "../../lib/i18n";
import { localize } from "../../lib/locale";
import { currentLocale } from "../../lib/request-locale";
export async function generateMetadata() {
  const locale = await currentLocale();
  return pageMetadata(
    t("meta.title.about", undefined, locale),
    t("meta.description.about", undefined, locale),
    localize(locale, "/mcp"),
    locale,
  );
}
export default async function McpPage() {
  const locale = await currentLocale();
  return (
    <>
      <SkipLink href="#conteudo">{t("skip.content", undefined, locale)}</SkipLink>
      <Header active="mcp" />
      <main id="conteudo" lang={locale === "pt" ? undefined : "pt"}>
        <Untranslated />
        <Section className="mcp-hero wrap">
          <Reveal>
            <h1 className="context-headline">
              <span className="headline-line">
                Uma <HeadlineIcon kind="chat" /> pergunta.
              </span>
              <span className="headline-line muted-heading">
                Uma ilha <HeadlineIcon kind="island" /> de respostas.
              </span>
            </h1>
            <p className="hero-description">
              Uma das ferramentas que criamos com IA para aproximar o Maio de
              todos. Pergunte, investigue e aprenda sobre a ilha nas suas
              palavras.
            </p>
          </Reveal>
        </Section>
        <Section className="demo-section wrap" id="demonstracao">
          <Reveal>
            <McpDemo />
          </Reveal>
        </Section>
        <Section className="how-section wrap" id="como-funciona">
          <Reveal className="section-heading">
            <div>
              <h2>
                Conheça melhor <br />a sua ilha.
              </h2>
            </div>
            <p>
              Para quem vive aqui, visita <br />
              ou quer saber mais.
            </p>
          </Reveal>
          <div className="how-grid">
            {[
              {
                title: "Descubra lugares.",
                text: "Quer conhecer as praias da ilha? Pergunte onde ficam e peça os links para saber mais.",
              },
              {
                title: "Entenda os números.",
                text: "Como varia o turismo ao longo do ano? Explore os dados e peça uma explicação simples.",
              },
              {
                title: "Continue a descobrir.",
                text: "Uma resposta despertou a sua curiosidade? Peça mais detalhes, compare ou faça outra pergunta.",
              },
            ].map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <article className="how-card">
                  <div>
                    <span>0{i + 1}</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </Section>
        <Section className="context-section wrap">
          <Reveal className="context-grid">
            <div>
              <h2>
                Como obter <br />
                uma resposta útil.
              </h2>
              <p>
                Não precisa de saber termos técnicos. Diga o que quer descobrir
                e peça ajuda para perceber a resposta.
              </p>
            </div>
            <div className="context-list">
              <article>
                <span>01</span>
                <div>
                  <h3>Diga o que procura.</h3>
                  <p>
                    Experimente: “Quero conhecer as praias do Maio. Onde posso
                    encontrar informação sobre cada uma?”
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Peça a origem da informação.</h3>
                  <p>
                    Pergunte “De onde vêm estes números?” ou “De que ano são?”.
                    Abra os links para conhecer a fonte.
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Peça uma explicação mais simples.</h3>
                  <p>
                    Se algo não ficou claro, diga “Explica melhor” ou “Dá-me um
                    exemplo”. A conversa pode continuar.
                  </p>
                </div>
              </article>
            </div>
          </Reveal>
        </Section>
        <Section className="faq-section wrap" id="perguntas">
          <Reveal>
            <h2>Perguntas frequentes.</h2>
            <div className="faq-list">
              {[
                [
                  "O que é o Maio no ChatGPT?",
                  "É uma forma de conhecer a ilha através de uma conversa. Pode fazer perguntas no ChatGPT e consultar informação pública sobre lugares, turismo e economia do Maio.",
                ],
                [
                  "O que posso perguntar?",
                  "Pode perguntar sobre praias e lugares, empresas ou turismo. Por exemplo: “Que dados existem sobre as empresas do Maio?” Nem todos os temas ou anos têm informação disponível; peça ao ChatGPT para confirmar o que encontrou.",
                ],
                [
                  "As respostas usam dados reais?",
                  "As três perguntas sugeridas mostram respostas preparadas. Para outras perguntas, o assistente consulta as ferramentas de dados do Maio. Confirme as fontes e as datas indicadas. Se faltar informação, peça mais contexto.",
                ],
                [
                  "É preciso saber usar tecnologia?",
                  "Basta escrever uma pergunta e clicar em Enviar. Não precisa de programar nem de conhecer os termos usados nos dados.",
                ],
                [
                  "Como começo?",
                  t("faq.start", { cta: t("cta.ask", undefined, locale) }, locale),
                ],
                [
                  "A informação está sempre atualizada?",
                  "Depende de quem publica a informação. Pergunte a que ano ou período se refere e consulte a fonte. Se estiver a preparar uma visita, confirme também os acessos e as condições locais.",
                ],
              ].map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <span>+</span>
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </Section>
        <Section className="closing wrap">
          <Reveal>
            <h2>
              O que quer saber <br />
              sobre o Maio?
            </h2>
            <Button href={localize(locale, "/chat")}>Conversar sobre o Maio</Button>
          </Reveal>
        </Section>
      </main>
      <Footer />
    </>
  );
}
