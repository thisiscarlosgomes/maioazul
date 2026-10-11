import { SkipLink } from "maio-ui";
import { Chat } from "../../components/chat";
import { Header, Footer } from "../../components/site-shell";
import { t } from "../../lib/i18n";
import { localize } from "../../lib/locale";
import { currentLocale } from "../../lib/request-locale";
import { pageMetadata } from "../../lib/seo";

export async function generateMetadata() {
  const locale = await currentLocale();
  return pageMetadata(
    t("meta.title.chat", undefined, locale),
    t("meta.description.chat", undefined, locale),
    localize(locale, "/chat"),
    locale,
  );
}

export default async function ChatPage() {
  const locale = await currentLocale();
  return (
    <>
      <SkipLink href="#conteudo">{t("skip.content", undefined, locale)}</SkipLink>
      <Header />
      <Chat locale={locale} />
      <Footer />
    </>
  );
}
