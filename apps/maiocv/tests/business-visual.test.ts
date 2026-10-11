import assert from "node:assert/strict";
import { test } from "node:test";
import { businessMetricProgram } from "../lib/business-visual.ts";

const total = {
  year: 2024,
  indicator: "active-enterprises",
  value: 307.999992,
  sourceId: "iae-2024-user-workbook",
  dimensions: { breakdown: "total", category: "total" },
};

test("the OpenUI business card uses the sourced total and rounds its survey estimate", () => {
  const program = businessMetricProgram({ numberMatched: 2, records: [
    { ...total, value: 279.1, dimensions: { breakdown: "size", category: "micro" } },
    total,
  ] });
  assert.match(program ?? "", /^root = BusinessMetric\(/);
  assert.match(program ?? "", /"308", "2024"/);
  assert.match(program ?? "", /Empresas ativas no Maio/);
  assert.match(program ?? "", /Inquérito Anual às Empresas · INE Cabo Verde/);
  assert.match(program ?? "", /Estimativa de inquérito; valor arredondado\./);
  assert.doesNotMatch(program ?? "", /279/);
  const english = businessMetricProgram({ numberMatched: 1, records: [total] }, "en");
  const french = businessMetricProgram({ numberMatched: 1, records: [total] }, "fr");
  assert.match(english ?? "", /Active businesses on Maio/);
  assert.match(english ?? "", /Annual enterprise survey · INE Cabo Verde/);
  assert.match(english ?? "", /Survey estimate; rounded value\./);
  assert.doesNotMatch(english ?? "", /Empresas ativas/);
  assert.match(french ?? "", /Entreprises actives à Maio/);
  assert.match(french ?? "", /Enquête annuelle auprès des entreprises · INE Cabo Verde/);
  assert.match(french ?? "", /Estimation d'enquête ; valeur arrondie\./);
});

test("the card stays hidden when the total is absent or the result is incomplete", () => {
  assert.equal(businessMetricProgram({ numberMatched: 1, records: [] }), null);
  assert.equal(businessMetricProgram({ numberMatched: 1, records: [
    { ...total, dimensions: { breakdown: "size", category: "micro" } },
  ] }), null);
});
