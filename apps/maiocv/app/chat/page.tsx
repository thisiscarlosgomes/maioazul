import { Chat } from "../../components/chat";
import { Header } from "../../components/site-shell";
import { pageMetadata } from "../../lib/seo";

export const metadata = pageMetadata(
  "Pergunte sobre o Maio — Chat com IA | MaioCV",
  "Converse sobre praias, turismo, economia e dados da ilha do Maio, Cabo Verde. Faça perguntas e explore as fontes numa conversa simples.",
  "/chat",
);

export default function ChatPage() {
  return <><Header /><Chat /></>;
}
