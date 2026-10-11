import { strict as assert } from "node:assert";
import { test } from "node:test";
import { t } from "../lib/i18n.ts";

test("header, footer, and chat copy come from the Portuguese catalog", () => {
  assert.equal(t("cta.ask"), "Perguntar sobre o Maio");
  assert.equal(t("chat.thinking"), "A pensar…");
  assert.equal(t("chat.welcome"), "Olá, Maio.");
  assert.equal(t("footer.place"), "Maio, Cabo Verde");
  assert.equal(t("skip.content"), "Saltar para o conteúdo");
  assert.equal(t("footer.copyright", { year: 2026 }), "© 2026 MaioCV");
  assert.equal(t("faq.start", { cta: t("cta.ask") }), "Clique em “Perguntar sobre o Maio” e escreva a sua pergunta. Pode continuar a conversa com novas perguntas, sem sair do MaioCV.");
  assert.doesNotMatch(t("cta.ask"), /Ask a question/);
  assert.doesNotMatch(t("chat.thinking"), /Thinking/);
  assert.equal(t("cta.ask", undefined, "en"), "Ask about Maio");
  assert.equal(t("cta.ask", undefined, "fr"), "Poser une question sur Maio");
  assert.equal(t("lang.fr", undefined, "en"), "Français");
  assert.equal(t("i18n.notTranslated", undefined, "fr"), "Cette section n'est disponible qu'en portugais.");
  assert.equal(t("home.h1.digital", undefined, "en"), "in digital.");
  assert.match(t("ess.verified", { date: "11 October 2026" }, "en"), /Verified on 11 October 2026 · MaioAzul/);
  assert.doesNotMatch(t("home.hero", undefined, "en"), /inteligência artificial/);
});
