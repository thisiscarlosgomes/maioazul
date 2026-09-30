// Provider-specific column names stay in a reviewed mapping, not in the public API.
// Inputs are typed JSON exports of aggregate tables; no guessing locale/units or scraping.
export function adaptStatisticalTable(rows, {columns, constants={}, dimensions={}}) {
  if(!Array.isArray(rows)) throw Error('Statistical table must be an array');
  return rows.map(row=>{
    const record={...constants};
    for(const [target,column] of Object.entries(columns)) {
      if(!Object.hasOwn(row,column)) throw Error(`Missing source column ${column}`);
      record[target]=row[column];
    }
    record.dimensions=Object.fromEntries(Object.entries(dimensions).map(([dimension,column])=>{
      if(!Object.hasOwn(row,column)) throw Error(`Missing dimension column ${column}`);
      return [dimension,row[column]];
    }));
    return record;
  });
}
export function adaptGeographicFile(geojson,{columns,collection,crs,caveats=[]}) {
  if(geojson?.type!=='FeatureCollection'||!Array.isArray(geojson.features)) throw Error('Expected a GeoJSON FeatureCollection');
  if(geojson.crs) throw Error('Legacy GeoJSON CRS must be reviewed and transformed explicitly before import');
  return geojson.features.map(feature=>{
    const record={collection,crs,geometry:feature.geometry,caveats};
    for(const [target,column] of Object.entries(columns)) {
      if(!Object.hasOwn(feature.properties||{},column)) throw Error(`Missing geographic property ${column}`);
      record[target]=feature.properties[column];
    }
    return record;
  });
}
