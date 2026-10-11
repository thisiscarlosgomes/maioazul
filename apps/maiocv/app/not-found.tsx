import Link from "next/link";
import { SkipLink } from "maio-ui";
import { Footer, Header } from "../components/site-shell";
import { t } from "../lib/i18n";
import { essentialsPath, localize } from "../lib/locale";
import { currentLocale } from "../lib/request-locale";

export default async function NotFound() {
  const locale = await currentLocale();
  return (
    <>
      <SkipLink href="#conteudo">{t("skip.content", undefined, locale)}</SkipLink>
      <Header />
      <main id="conteudo" className="wrap essentials">
        <h1>{t("notFound.title", undefined, locale)}</h1>
        <p>{t("notFound.body", undefined, locale)}</p>
        <ul>
          <li>
            <Link href={essentialsPath(locale)}>{t("nav.visit", undefined, locale)}</Link>
          </li>
          <li>
            <Link href={localize(locale, "/search")}>{t("nav.search", undefined, locale)}</Link>
          </li>
          <li>
            <Link href={localize(locale, "/chat")}>{t("nav.chat", undefined, locale)}</Link>
          </li>
        </ul>
      </main>
      <Footer />
    </>
  );
}
