import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeINE,applyINE} from '../lib/ine/importer.mjs';
import {adaptStatisticalTable,adaptGeographicFile} from '../lib/ine/adapters.mjs';
// Synthetic validation fixtures only. These are never registered or published.
const fixture=()=>({source:{id:'ine-test-only',title:'TEST FIXTURE NOT A CENSUS PUBLICATION',url:'https://ine.cv/test-fixture',publisher:'INE Cabo Verde',license:'Not specified by source',licenseUrl:null,updatedAt:null,retrievedAt:null,referencePeriod:'2021',dataClass:'aggregate',review:{status:'verified',reviewedAt:'2026-09-17'}},crosswalk:[{code:'TEST-LOCAL',level:'locality',geographicScope:'test:locality',locality:'Test locality',placeId:'fixture-place',evidence:'Test-only explicit crosswalk'}],statistics:[{sourceRecordId:'test-row',datasetId:'population',geographicCode:'TEST-LOCAL',year:2021,referencePeriod:'2021',indicator:'test-count',value:null,valueStatus:'suppressed',unit:'persons',dimensions:{sex:'test-code'},caveats:['Test only']}],geography:[]});
const known=[{id:'fixture-place',featureIds:[]}];
test('INE preserves suppression, codes, dimensions, periods and source provenance',()=>{
 const result=normalizeINE(fixture(),known),r=result.records[0];
 assert.equal(r.value,null);assert.equal(r.valueStatus,'suppressed');assert.equal(r.year,2021);
 assert.equal(r.placeId,'fixture-place');assert.equal(r.updatedAt,null);assert.equal(r.sourceId,'ine-test-only');
 assert.deepEqual(r.dimensions,{sex:'test-code'});
 const pathId=fixture();pathId.statistics[0].sourceRecordId='table/row % 01';assert.match(normalizeINE(pathId,known).records[0].id,/^[A-Za-z0-9_-]+$/);
 const changed=fixture();changed.statistics[0].valueStatus='reported';changed.statistics[0].value=0;
 const updated=normalizeINE(changed,known);assert.equal(updated.records[0].value,0);assert.equal(updated.records[0].id,r.id);
 assert.notEqual(updated.source.checksum,result.source.checksum);
});
test('INE rejects unreviewed sources, unsafe geography links and ambiguous values',()=>{
 for(const mutate of [p=>p.source.review.status='needs_review',p=>p.source.url='https://example.org',p=>p.source.dataClass='microdata',p=>p.statistics[0].value=0,p=>p.statistics[0].geographicCode='unmapped',p=>p.crosswalk[0].placeId='unknown',p=>p.crosswalk[0].level='municipality',p=>p.statistics.push(p.statistics[0]),p=>p.statistics[0].personName='private',p=>p.statistics[0].dimensions.sex=123,p=>p.statistics[0].datasetId='not-supported']){const input=fixture();mutate(input);assert.throws(()=>normalizeINE(input,known));}
});
test('INE geometry requires explicit CRS and preserves original place geometry',()=>{
 const p=fixture();p.geography=[{sourceRecordId:'test-feature',geographicCode:'TEST-LOCAL',collection:'localities',name:'Test locality',crs:'OGC:CRS84',geometry:{type:'Point',coordinates:[-23.15,15.25]},caveats:['Test only']}];
 const imported=normalizeINE(p,known);assert.equal(imported.features[0].properties.recordType,'official-geography');
 const state={sources:[],datasets:[{id:'population',status:'planned',sourceIds:[],records:[]}],features:new Map(),registry:structuredClone(known)};
 applyINE(imported,state);assert.equal(state.datasets[0].status,'available');assert.equal(state.datasets[0].records.length,1);
 assert.equal(state.registry[0].featureIds.length,0);assert.equal(state.registry[0].relatedFeatures.length,1);
 assert.throws(()=>applyINE(imported,state),/duplicate source/);
 p.geography[0].crs='EPSG:3857';assert.throws(()=>normalizeINE(p,known),/WGS84/);
 p.geography[0].crs='OGC:CRS84';p.geography[0].geometry.coordinates=[15.25,-23.15];assert.throws(()=>normalizeINE(p,known),/extent/);
});
test('table and GeoJSON adapters map explicit columns without coercion',()=>{
 const rows=adaptStatisticalTable([{code:'001',value:null,sex:'T'}],{columns:{geographicCode:'code',value:'value'},dimensions:{sex:'sex'},constants:{valueStatus:'suppressed'}});
 assert.equal(rows[0].geographicCode,'001');assert.equal(rows[0].value,null);
 assert.throws(()=>adaptStatisticalTable([{}],{columns:{value:'absent'}}),/Missing/);
 const features=adaptGeographicFile({type:'FeatureCollection',features:[{properties:{code:'001',label:'Test'},geometry:{type:'Point',coordinates:[-23.15,15.25]}}]},{columns:{geographicCode:'code',name:'label'},collection:'localities',crs:'OGC:CRS84'});
 assert.equal(features[0].name,'Test');
});
