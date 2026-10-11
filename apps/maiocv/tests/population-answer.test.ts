import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isPopulationTotalQuestion, populationAnswer } from "../lib/population-answer.ts";

const data = { records: [{ year: 2025, geographicScope: "island:maio", indicator: "resident-population", value: 6936 }] };

test("basic population questions use the latest published island record", () => {
  assert.equal(isPopulationTotalQuestion("Qual é a população do Maio?"), true);
  assert.match(populationAnswer(data, "Qual é a população do Maio?") ?? "", /6 936 residentes em 2025/);
  assert.match(populationAnswer(data, "Qual é a população do Maio?") ?? "", /não indica a tabela publicada/);
});

test("an unavailable year is not presented as the latest year", () => {
  const answer = populationAnswer(data, "Qual é a população do Maio em 2026?") ?? "";
  assert.match(answer, /Não encontrei um valor publicado para 2026/);
  assert.match(answer, /6 936 residentes em 2025/);
});

test("other population analysis stays with the chat backend", () => {
  assert.equal(isPopulationTotalQuestion("Como evoluiu a população do Maio?"), false);
  assert.equal(populationAnswer({ records: [] }, "Qual é a população?"), null);
});
