import { strict as assert } from "node:assert";
import { test } from "node:test";
import { htmlLang, languageAlternates, pageMetadata, publicRoutes, sitemapEntries } from "../lib/seo.ts";

test("each public page has Portuguese, English, and French alternates", () => {
  assert.equal(htmlLang, "pt");
  assert.deepEqual(publicRoutes.map((route) => route.path), [
    "/pt", "/pt/mcp", "/pt/chat", "/pt/essenciais",
    "/en", "/en/mcp", "/en/chat", "/en/essentials",
    "/fr", "/fr/mcp", "/fr/chat", "/fr/essentiels",
  ]);
  const languages = languageAlternates("/chat");
  assert.equal(languages["pt-PT"], "https://www.maio.cv/pt/chat");
  assert.equal(languages["en-GB"], "https://www.maio.cv/en/chat");
  assert.equal(languages["fr-FR"], "https://www.maio.cv/fr/chat");
  assert.equal(languages["x-default"], "https://www.maio.cv/pt/chat");
  const meta = pageMetadata("title", "summary", "/en/chat", "en");
  assert.equal(meta.openGraph && "locale" in meta.openGraph ? meta.openGraph.locale : "", "en_GB");
  const entries = sitemapEntries();
  assert.equal(entries.length, 12);
  assert.equal(entries[0]?.url, "https://www.maio.cv/pt");
  assert.equal(entries[3]?.url, "https://www.maio.cv/pt/essenciais");
  assert.equal(entries[11]?.url, "https://www.maio.cv/fr/essentiels");
});
