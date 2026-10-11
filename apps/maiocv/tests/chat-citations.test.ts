import { strict as assert } from "node:assert";
import { test } from "node:test";
import { citationsFrom, declaredCitations, isUncited } from "../lib/chat-citations.ts";
import { humanContactUrl } from "../lib/emergency.ts";

test("a live answer is uncited only when the response declares an empty citation list", () => {
  assert.equal(declaredCitations({ message: "Hello" }), null);
  assert.equal(isUncited({ message: "Hello" }), false);
  assert.equal(isUncited({ message: "Hello", citations: [] }), true);
  assert.equal(isUncited({ message: "Hello", citations: "none" }), false);
  assert.deepEqual(citationsFrom({ citations: [{ name: "CV Interilhas", href: "https://www.cvinterilhas.cv/routesschedules", kind: "published-schedule" }] }), [
    { name: "CV Interilhas", href: "https://www.cvinterilhas.cv/routesschedules", kind: "published-schedule" },
  ]);
  assert.equal(isUncited({ citations: [{ name: "CV Interilhas" }] }), false);
});

test("an empty human contact URL hides the link", () => {
  assert.equal(humanContactUrl(undefined), "https://instagram.com/maio__azul");
  assert.equal(humanContactUrl(""), "");
  assert.equal(humanContactUrl("  "), "");
});
