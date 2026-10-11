import { strict as assert } from "node:assert";
import { test } from "node:test";
import { citationsFrom, isUncited } from "../lib/chat-citations.ts";
import { humanContactUrl } from "../lib/emergency.ts";

test("a plain chat message has no citation", () => {
  assert.equal(isUncited({ message: "Hello" }), true);
  assert.deepEqual(citationsFrom({ citations: [{ name: "CV Interilhas", href: "https://www.cvinterilhas.cv/routesschedules", kind: "published-schedule" }] }), [
    { name: "CV Interilhas", href: "https://www.cvinterilhas.cv/routesschedules", kind: "published-schedule" },
  ]);
});

test("an empty human contact URL hides the link", () => {
  assert.equal(humanContactUrl(undefined), "https://instagram.com/maio__azul");
  assert.equal(humanContactUrl(""), "");
  assert.equal(humanContactUrl("  "), "");
});
