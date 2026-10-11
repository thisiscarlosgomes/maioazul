import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EMERGENCY } from "../lib/emergency.ts";
import { flightRouteLabel, loadEssentials, paymentCount, sailingsForToday, scheduleSource, verifiedDate, visibleCaveat } from "../lib/essentials.ts";

test("emergency links are the decided numbers", () => {
  assert.deepEqual(EMERGENCY.map((item) => item.href), ["tel:132", "tel:+2382551130", "tel:130"]);
});

test("a ferry label shows the kind, the retrieved time, and the caveats", () => {
  const source = scheduleSource({
    kind: "published-schedule",
    source: { name: "CV Interilhas" },
    retrievedAt: "2026-10-11T19:30:00.000Z",
    caveats: ["Only the published day is listed."],
  }, "en");
  assert.match(source.line, /Published timetable · CV Interilhas · Retrieved 18:30/);
  assert.doesNotMatch(source.line, /updated/i);
  assert.deepEqual(source.caveats, ["Only the published day is listed."]);
  assert.match(visibleCaveat("Only the explicitly selected source day is parsed. Date-picker options are not confirmed sailing dates.", "fr"), /Seul le jour/);
  assert.doesNotMatch(visibleCaveat("Only the explicitly selected source day is parsed. Date-picker options are not confirmed sailing dates.", "pt"), /Only the explicitly/);
  assert.doesNotMatch(visibleCaveat("updated_at is null because operator publication time is unknown; retrievedAt is fetch time.", "pt"), /updated_at|retrievedAt/);
  assert.doesNotMatch(visibleCaveat("updated_at is null because operator publication time is unknown; retrievedAt is fetch time.", "fr"), /updated_at|retrievedAt/);
  assert.doesNotMatch(visibleCaveat("Unverified local cache files are not used. updated_at is null: publication time is unknown.", "fr"), /updated_at|retrievedAt/);
  assert.equal(visibleCaveat("Only the published day is listed.", "pt"), "A nota da fonte não pôde ser mostrada. Confirme o horário com o operador.");
  assert.equal(visibleCaveat("Only the published day is listed.", "fr"), "La note de la source n'a pas pu être affichée. Confirmez l'horaire auprès de l'opérateur.");
  assert.doesNotMatch(visibleCaveat("Only the published day is listed.", "en"), /Only the published day/);
  assert.notEqual(flightRouteLabel("rai_mmo", "en"), flightRouteLabel("mmo_rai", "en"));
  assert.equal(verifiedDate("2026-10-11", "en"), "11 October 2026");
});

test("yesterday's sailings are not today's", () => {
  const rows = sailingsForToday({
    schedules: [
      { from: "Santiago", to: "Maio", departure: "17:00", date: "2026-10-10" },
      { from: "Maio", to: "Santiago", departure: "08:00", date: "2026-10-11" },
    ],
  }, "2026-10-11");
  assert.deepEqual(rows, [{ from: "Maio", to: "Santiago", departure: "08:00", date: "2026-10-11" }]);
});

test("Maio payment counts come from the payload", () => {
  const payload = {
    atm_terminals_by_island: [{ name: "Maio", values: { "2023": 3 } }],
    pos_terminals_by_island: [{ name: "Maio", values: { "2023": 194 } }],
  };
  assert.equal(paymentCount(payload, "atm_terminals_by_island", "Maio", "2023"), 3);
  assert.equal(paymentCount(payload, "pos_terminals_by_island", "Maio", "2023"), 194);
  assert.equal(paymentCount(payload, "atm_terminals_by_island", "Maio", "2024"), null);
});

test("empty flight routes are not described as no service", async () => {
  const body = await loadEssentials((async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("boats")) {
      return Response.json({ schedules: [], caveats: ["Only the published day."], retrievedAt: "2026-10-11T12:00:00.000Z" });
    }
    if (url.includes("flights")) {
      return Response.json({
        status: "partial",
        routes: { rai_mmo: [], mmo_rai: [] },
        sourceUrls: { rai_mmo: "https://info.flightmapper.net/route/example" },
        caveats: ["Third-party timetable."],
        retrievedAt: "2026-10-11T12:00:00.000Z",
      });
    }
    return Response.json({
      atm_terminals_by_island: [{ name: "Maio", values: { "2023": 3 } }],
      pos_terminals_by_island: [{ name: "Maio", values: { "2023": 194 } }],
    });
  }) as typeof fetch, new Date("2026-10-11T15:00:00.000Z"));
  assert.equal(body.ferry.status, "no-current-records");
  assert.equal(body.flight.status, "no-current-records");
  assert.equal(body.payments.data?.atms.value, 3);
  assert.equal(body.payments.data?.pos.value, 194);
  assert.equal(JSON.stringify(body).includes("no service"), false);
  assert.equal(JSON.stringify(body).includes("no ferry"), false);
});
