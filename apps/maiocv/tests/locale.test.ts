import { strict as assert } from "node:assert";
import { test } from "node:test";
import { essentialsPath, localize, preferredLocale, routeAlias, stripLocale, switchPath } from "../lib/locale.ts";

test("the home redirect follows Accept-Language only when no cookie is involved", () => {
  assert.equal(preferredLocale(null), "pt");
  assert.equal(preferredLocale("pt-PT,pt;q=0.9,en;q=0.8"), "pt");
  assert.equal(preferredLocale("fr-FR,fr;q=0.8,en;q=0.5"), "fr");
  assert.equal(preferredLocale("de-DE,de;q=0.9"), "en");
});

test("the language switch uses the canonical essentials path", () => {
  assert.equal(switchPath("en", "/pt/essenciais"), "/en/essentials");
  assert.equal(switchPath("fr", "/en/essentials"), "/fr/essentiels");
  assert.equal(switchPath("pt", "/fr/essentiels"), "/pt/essenciais");
  assert.equal(switchPath("en", "/pt/chat"), "/en/chat");
});

test("visit and search aliases point at the canonical pages", () => {
  assert.equal(routeAlias.visitar, "essentials");
  assert.equal(routeAlias.visit, "essentials");
  assert.equal(routeAlias.visiter, "essentials");
  assert.equal(routeAlias.pesquisar, "search");
  assert.equal(routeAlias.pesquisa, "search");
  assert.equal(routeAlias.recherche, "search");
  assert.equal(essentialsPath("pt"), "/pt/essenciais");
  assert.equal(essentialsPath("en"), "/en/essentials");
  assert.equal(essentialsPath("fr"), "/fr/essentiels");
});

test("locale links keep the page and drop a previous prefix", () => {
  assert.equal(localize("en", "/chat"), "/en/chat");
  assert.equal(localize("fr", "/pt/mcp"), "/fr/mcp");
  assert.equal(localize("pt", "/"), "/pt");
  assert.equal(stripLocale("/en/chat"), "/chat");
});
