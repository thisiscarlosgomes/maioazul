import { strict as assert } from "node:assert";
import { test } from "node:test";
import { nameOf, sourceName, toHit } from "../lib/search.ts";

test("names fall back from display name, object, and title", () => {
  assert.equal(nameOf({ properties: { displayName: "Bitxe Rotcha", name: "Other" } }, "en").name, "Bitxe Rotcha");
  assert.deepEqual(nameOf({ properties: { name: { pt: "Praia", en: "Beach" } } }, "en"), { name: "Beach", lang: "en" });
  assert.deepEqual(nameOf({ properties: { name: { pt: "Praia" } } }, "fr"), { name: "Praia", lang: "pt" });
  assert.equal(nameOf({ properties: { name: null, attributes: { title: "Camp" } } }, "pt").name, "Camp");
});

test("a feature without geometry stays in the list and is marked unmapped", () => {
  const hit = toHit({
    id: "camp",
    geometry: null,
    properties: { name: "Beach Volley Camp", sourceIds: ["maio-guide"], attributes: { description: { en: "Sessions by the sea.", pt: "Sessões." } } },
  }, "en");
  assert.equal(hit?.unmapped, true);
  assert.equal(hit?.description, "Sessions by the sea.");
  assert.equal(hit?.source, "maio-guide");
  assert.equal(sourceName("maio-guide", "en"), "Maio Guide experiences");
  assert.equal(sourceName("settlements", "pt"), "Localidades");
  assert.equal(sourceName("settlements", "fr"), "Localités");
  assert.equal(sourceName("not-a-real-source", "en"), "Maio open data");
  assert.equal(toHit({ properties: { nameStatus: "missing", name: "Hidden" } }, "en"), null);
});
