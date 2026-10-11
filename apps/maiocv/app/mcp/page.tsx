import { Button, Section, SkipLink } from "maio-ui";
import { HeadlineIcon } from "../../components/headline-icon";
import { pageMetadata } from "../../lib/seo";
import { Header, Footer } from "../../components/site-shell";
import { Reveal } from "../../components/motion";
import { McpDemo } from "../../components/mcp-demo";
import { t, type MessageKey } from "../../lib/i18n";
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
  const copy = (key: MessageKey) => t(key, undefined, locale);
  const steps = [1, 2, 3] as const;
  const tips = [1, 2, 3] as const;
  const faqs = [1, 2, 3, 4, 5, 6] as const;
  return (
    <>
      <SkipLink href="#conteudo">{copy("skip.content")}</SkipLink>
      <Header active="mcp" />
      <main id="conteudo">
        <Section className="mcp-hero wrap">
          <Reveal>
            <h1 className="context-headline">
              <span className="headline-line">
                {copy("mcp.h1.one")} <HeadlineIcon kind="chat" locale={locale} /> {copy("mcp.h1.question")}
              </span>
              <span className="headline-line muted-heading">
                {copy("mcp.h1.island")} <HeadlineIcon kind="island" locale={locale} /> {copy("mcp.h1.answers")}
              </span>
            </h1>
            <p className="hero-description">{copy("mcp.hero")}</p>
          </Reveal>
        </Section>
        <Section className="demo-section wrap" id="demonstracao">
          <Reveal>
            <McpDemo locale={locale} />
          </Reveal>
        </Section>
        <Section className="how-section wrap" id="como-funciona">
          <Reveal className="section-heading">
            <div>
              <h2>
                {copy("mcp.how.line1")} <br />
                {copy("mcp.how.line2")}
              </h2>
            </div>
            <p>
              {copy("mcp.how.lead")}
            </p>
          </Reveal>
          <div className="how-grid">
            {steps.map((step, i) => (
              <Reveal key={step} delay={i * 0.08}>
                <article className="how-card">
                  <div>
                    <span>0{step}</span>
                  </div>
                  <h3>{copy(`mcp.step${step}.title` as MessageKey)}</h3>
                  <p>{copy(`mcp.step${step}.text` as MessageKey)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </Section>
        <Section className="context-section wrap">
          <Reveal className="context-grid">
            <div>
              <h2>
                {copy("mcp.useful.line1")} <br />
                {copy("mcp.useful.line2")}
              </h2>
              <p>{copy("mcp.useful.lead")}</p>
            </div>
            <div className="context-list">
              {tips.map((tip) => (
                <article key={tip}>
                  <span>0{tip}</span>
                  <div>
                    <h3>{copy(`mcp.tip${tip}.title` as MessageKey)}</h3>
                    <p>{copy(`mcp.tip${tip}.text` as MessageKey)}</p>
                  </div>
                </article>
              ))}
            </div>
          </Reveal>
        </Section>
        <Section className="faq-section wrap" id="perguntas">
          <Reveal>
            <h2>{copy("mcp.faq.title")}</h2>
            <div className="faq-list">
              {faqs.map((item) => {
                const question = copy(`mcp.faq.${item}.q` as MessageKey);
                const answer = item === 5
                  ? t("faq.start", { cta: copy("cta.ask") }, locale)
                  : copy(`mcp.faq.${item}.a` as MessageKey);
                return (
                  <details key={question}>
                    <summary>
                      {question}
                      <span>+</span>
                    </summary>
                    <p>{answer}</p>
                  </details>
                );
              })}
            </div>
          </Reveal>
        </Section>
        <Section className="closing wrap">
          <Reveal>
            <h2>
              {copy("mcp.closing.line1")} <br />
              {copy("mcp.closing.line2")}
            </h2>
            <Button href={localize(locale, "/chat")}>{copy("mcp.closing.cta")}</Button>
          </Reveal>
        </Section>
      </main>
      <Footer />
    </>
  );
}
