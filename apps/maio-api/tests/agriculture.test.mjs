import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveApi } from "../lib/api.mjs";
import { openapi } from "../lib/openapi.mjs";

const snapshot=JSON.parse(await readFile(new URL("../data/snapshot.json",import.meta.url)));
const api=path=>resolveApi(snapshot,path.split("/"),new URLSearchParams());

test("agriculture publishes reviewed INGT records and calculated areas without treating source zeroes as area",()=>{
  const overview=api("agriculture"), landUse=api("agriculture/land-use"), areas=api("agriculture/areas");
  assert.equal(overview.sourceId,"ingt-carta-agricola-maio");
  assert.equal(overview.featureCount,48);
  assert.equal(overview.cultivatedArea.irrigatedHectaresCalculated,58.229742);
  assert.equal(overview.cultivatedArea.rainFedHectaresCalculated,382.481277);
  assert.equal(landUse.classifications.length,7);
  assert.equal(areas.numberMatched,48);
  assert.ok(areas.features.every(f=>f.geometry&&f.properties.attributes.areaHectaresCalculated>0));
  assert.match(overview.methodology.areaFieldAssessment,/47 of 48/);
  assert.ok(overview.methodology.crossClassificationOverlapHectaresCalculated>0);
});

test("agriculture provenance retains layer, unknown source date and import method",()=>{
  const source=api("sources/ingt-carta-agricola-maio");
  assert.equal(source.layerId,5);
  assert.equal(source.layerName,"Carta Agrícola Maio");
  assert.equal(source.sourceUpdatedAt,null);
  assert.equal(source.referenceDate,null);
  assert.equal(source.refresh.method,"arcgis-rest-import");
  assert.match(source.layerUrl,/MapServer\/5$/);
});

test("agriculture OpenAPI uses reusable schemas for all domain routes",()=>{
  const spec=openapi(snapshot);
  for(const path of ["/agriculture","/agriculture/overview","/agriculture/land-use","/agriculture/areas","/geo/agriculture"]){
    assert.ok(spec.paths[path]);
    assert.ok(spec.paths[path].get.responses[200].content[Object.keys(spec.paths[path].get.responses[200].content)[0]].schema.$ref);
  }
  assert.ok(spec.components.schemas.AgricultureOverview);
  assert.ok(spec.components.schemas.AgricultureMethodology);
});
