import { SkipLink } from "maio-ui";
import { Chat } from "../../components/chat";
import { Header, Footer } from "../../components/site-shell";
import { t } from "../../lib/i18n";
import { pageMetadata } from "../../lib/seo";

export const metadata = pageMetadata(
  "Pergunte sobre o Maio — Chat com IA | MaioCV",
  "Converse sobre praias, turismo, economia e dados da ilha do Maio, Cabo Verde. Faça perguntas e explore as fontes numa conversa simples.",
  "/chat",
);

export default function ChatPage() {
  return (
    <>
      <SkipLink href="#conteudo">{t("skip.content")}</SkipLink>
      <Header />
      <Chat />
      <Footer />
    </>
  );
}
