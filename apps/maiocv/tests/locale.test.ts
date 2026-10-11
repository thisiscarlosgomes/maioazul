import { strict as assert } from "node:assert";
import { test } from "node:test";
import { localize, preferredLocale, stripLocale, switchPath } from "../lib/locale.ts";

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
  assert.equal(switchPath("en", "/pt/search?q=praia"), "/en/search?q=praia");
});

test("locale links keep the page and drop a previous prefix", () => {
  assert.equal(localize("en", "/chat"), "/en/chat");
  assert.equal(localize("fr", "/pt/mcp"), "/fr/mcp");
  assert.equal(localize("pt", "/"), "/pt");
  assert.equal(stripLocale("/en/chat"), "/chat");
});
