import { SkipLink } from "maio-ui";
import { Header, Footer } from "../../components/site-shell";
import { t } from "../../lib/i18n";
import { localize } from "../../lib/locale";
import { currentLocale } from "../../lib/request-locale";
import { pageMetadata } from "../../lib/seo";
import { searchFeatures, sourceName } from "../../lib/search";

export async function generateMetadata() {
  const locale = await currentLocale();
  return pageMetadata(t("search.title", undefined, locale), t("search.placeholder", undefined, locale), localize(locale, "/search"), locale);
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const locale = await currentLocale();
  const query = ((await searchParams).q ?? "").trim();
  let hits: Awaited<ReturnType<typeof searchFeatures>> = [];
  let failed = false;
  if (query) {
    try {
      hits = await searchFeatures(fetch, query, locale);
    } catch {
      failed = true;
    }
  }
  return (
    <>
      <SkipLink href="#conteudo">{t("skip.content", undefined, locale)}</SkipLink>
      <Header active="search" />
      <main id="conteudo" className="wrap search-page">
        <h1>{t("search.title", undefined, locale)}</h1>
        <form action={localize(locale, "/search")}>
          <label className="sr-only" htmlFor="q">{t("search.placeholder", undefined, locale)}</label>
          <input id="q" name="q" defaultValue={query} />
        </form>
        {failed ? (
          <p role="alert">
            {t("search.error", undefined, locale)}{" "}
            <a href={`${localize(locale, "/search")}?q=${encodeURIComponent(query)}`}>{t("search.retry", undefined, locale)}</a>
          </p>
        ) : null}
        {query && !failed ? <p role="status">{t("search.results", { n: hits.length, q: query }, locale)}</p> : null}
        <ul>
          {hits.map((hit) => (
            <li key={hit.id} lang={hit.nameLang === locale ? undefined : hit.nameLang}>
              <strong>{hit.name}</strong>
              {hit.description ? <p>{hit.description}</p> : null}
              {hit.unmapped ? <p>{t("search.unmapped", undefined, locale)}</p> : null}
              <p>{hit.source ? sourceName(hit.source, locale) : t("search.noSource", undefined, locale)}</p>
            </li>
          ))}
        </ul>
        {query && !failed && hits.length === 0 ? <p>{t("search.none", { q: query }, locale)}</p> : null}
      </main>
      <Footer />
    </>
  );
}
