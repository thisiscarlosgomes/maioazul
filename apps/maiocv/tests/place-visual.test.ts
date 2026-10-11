import { strict as assert } from "node:assert";
import { test } from "node:test";
import { placeVisualProgram } from "../lib/place-visual.ts";

const payload = {
  numberMatched: 44,
  features: [
    { id: "first", properties: { name: "Praia de Lagoa" } },
    { id: "second", properties: { name: "Praia de Ponta Preta" } },
    { id: "duplicate", properties: { name: "Praia de Ponta Preta" } },
    { id: "third", properties: { name: "Praia da Salina" } },
  ],
};

test("place cards include only named places in answer order, without duplicates", () => {
  const program = placeVisualProgram(payload, "Conheça Praia da Salina, Praia de Ponta Preta e Praia de Lagoa.", "beaches");
  assert.ok(program);
  assert.equal((program.match(/Praia de Ponta Preta/g) ?? []).length, 1);
  assert.ok(program.indexOf("Praia da Salina") < program.indexOf("Praia de Ponta Preta"));
  assert.ok(program.includes("44 praias mapeadas"));
  assert.ok(program.includes("api.maio.cv/api/v1/features/second"));
});

test("place cards fall back to answer text when no location matches", () => {
  assert.equal(placeVisualProgram(payload, "Não consigo confirmar as praias.", "beaches"), null);
});

test("heritage cards use localized names and source locations", () => {
  const program = placeVisualProgram({ numberMatched: 1, features: [{ id: "chapel", properties: {
    name: { pt: "Capela do Cristo Rei" }, attributes: { location: { pt: "Figueira Horta" }, coordinates: [-23.15, 15.16] },
  } }] }, "Pode visitar a Capela do Cristo Rei.", "heritage");
  assert.ok(program?.includes("Figueira Horta"));
  assert.ok(program?.includes("openstreetmap.org"));
});

test("image-backed beach records win over duplicate map records", () => {
  const image = "https://res.cloudinary.com/dhxfkhewr/image/upload/places/ponta.jpg";
  const program = placeVisualProgram({ numberMatched: 2, features: [
    { id: "osm", properties: { name: "Praia de Ponta Preta" } },
    { id: "visit", properties: { name: "Praia de Ponta Preta", attributes: { image_url: image } } },
  ] }, "Visite a Praia de Ponta Preta.", "beaches");
  assert.ok(program?.includes(image));
  assert.ok(program?.includes("api.maio.cv/api/v1/features/visit"));
  assert.ok(!program?.includes("api.maio.cv/api/v1/features/osm"));
});

test("place card chrome follows the page language", () => {
  const answer = "Conheça Praia da Salina, Praia de Ponta Preta e Praia de Lagoa.";
  const portuguese = placeVisualProgram(payload, answer, "beaches", "pt");
  const english = placeVisualProgram(payload, answer, "beaches", "en");
  const french = placeVisualProgram(payload, answer, "beaches", "fr");
  assert.ok(portuguese?.includes("Praias no Maio"));
  assert.ok(portuguese?.includes("44 praias mapeadas"));
  assert.ok(english?.includes("Beaches on Maio"));
  assert.ok(english?.includes("44 mapped beaches"));
  assert.ok(!english?.includes("Praias no Maio"));
  assert.ok(!english?.includes("praias mapeadas"));
  assert.ok(french?.includes("Plages à Maio"));
  assert.ok(french?.includes("44 plages cartographiées"));
  const heritage = placeVisualProgram({ numberMatched: 2, features: [
    { id: "chapel", properties: { name: "Capela do Cristo Rei" } },
  ] }, "Capela do Cristo Rei", "heritage", "en");
  assert.ok(heritage?.includes("Heritage on Maio"));
  assert.ok(heritage?.includes("2 mapped places"));
  assert.match(heritage ?? "", /detail\\":\\"Heritage\\"/);
  const uncounted = placeVisualProgram({ features: [
    { id: "chapel", properties: { name: "Capela do Cristo Rei" } },
  ] }, "Capela do Cristo Rei", "heritage", "fr");
  assert.ok(uncounted?.includes("Lieux cartographiés"));
  assert.ok(uncounted?.includes("Patrimoine à Maio"));
});

test("bilingual place names match Portuguese or the page language and display the page language", () => {
  const bilingual = {
    numberMatched: 1,
    features: [{ id: "cadjetinha", properties: { name: { pt: "Praia de Cadjetinha", en: "Cadjetinha Beach" } } }],
  };
  const englishFromPortuguese = placeVisualProgram(bilingual, "You can visit Praia de Cadjetinha.", "beaches", "en");
  assert.ok(englishFromPortuguese?.includes("Cadjetinha Beach"));
  assert.ok(!englishFromPortuguese?.includes("Praia de Cadjetinha"));
  const englishFromEnglish = placeVisualProgram(bilingual, "You can visit Cadjetinha Beach.", "beaches", "en");
  assert.ok(englishFromEnglish?.includes("Cadjetinha Beach"));
  assert.ok(!englishFromEnglish?.includes("Praia de Cadjetinha"));
  const portuguese = placeVisualProgram(bilingual, "Pode visitar a Praia de Cadjetinha.", "beaches", "pt");
  assert.ok(portuguese?.includes("Praia de Cadjetinha"));
  assert.ok(!portuguese?.includes("Cadjetinha Beach"));
  const french = placeVisualProgram(bilingual, "Vous pouvez visiter Praia de Cadjetinha.", "beaches", "fr");
  assert.ok(french?.includes("Praia de Cadjetinha"));
  assert.ok(french?.includes("Plages à Maio"));
  assert.ok(!french?.includes("Cadjetinha Beach"));
  const accented = {
    numberMatched: 1,
    features: [{ id: "sao", properties: { name: { pt: "Praia de São Francisco", en: "São Francisco Beach" } } }],
  };
  assert.ok(placeVisualProgram(accented, "See PRAIA DE SAO FRANCISCO.", "beaches", "en")?.includes("São Francisco Beach"));
});

test("untrusted image URLs are excluded", () => {
  const program = placeVisualProgram({ numberMatched: 1, features: [
    { id: "place", properties: { name: "Praia de Lagoa", attributes: { image_url: "https://example.com/other.jpg" } } },
  ] }, "Praia de Lagoa", "beaches");
  assert.ok(program && !program.includes("example.com"));
});
