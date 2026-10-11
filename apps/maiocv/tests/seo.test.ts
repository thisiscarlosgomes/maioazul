import { strict as assert } from "node:assert";
import { test } from "node:test";
import { htmlLang, languageAlternates, pageMetadata, publicRoutes, sitemapEntries } from "../lib/seo.ts";

test("each public route declares Portuguese hreflang and x-default", () => {
  assert.equal(htmlLang, "pt");
  assert.deepEqual(publicRoutes.map((route) => route.path), ["/", "/mcp", "/chat"]);
  for (const route of publicRoutes) {
    const languages = languageAlternates(route.path, route.lang);
    assert.equal(languages["pt-PT"], `https://www.maio.cv${route.path === "/" ? "/" : route.path}`);
    assert.equal(languages["x-default"], languages["pt-PT"]);
    assert.equal("en-GB" in languages, false);
    assert.equal("fr-FR" in languages, false);
    const meta = pageMetadata("title", "summary", route.path, route.lang);
    assert.deepEqual(meta.alternates?.languages, languages);
  }
  const entries = sitemapEntries();
  assert.deepEqual(entries.map((entry) => entry.url), [
    "https://www.maio.cv/",
    "https://www.maio.cv/mcp",
    "https://www.maio.cv/chat",
  ]);
  assert.equal(entries[2]?.alternates?.languages?.["pt-PT"], "https://www.maio.cv/chat");
});
