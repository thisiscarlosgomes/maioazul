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

test("untrusted image URLs are excluded", () => {
  const program = placeVisualProgram({ numberMatched: 1, features: [
    { id: "place", properties: { name: "Praia de Lagoa", attributes: { image_url: "https://example.com/other.jpg" } } },
  ] }, "Praia de Lagoa", "beaches");
  assert.ok(program && !program.includes("example.com"));
});
