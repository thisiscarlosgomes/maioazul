#!/usr/bin/env python3
"""Build the reviewed Maio agriculture package from INGT ArcGIS REST exports."""
import argparse, hashlib, json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from pyproj import Geod
from shapely import orient_polygons
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

SOURCE_URL = "https://ingtgeo.gov.cv/arcgisingt/rest/services/SDI/Carta_Agricola/MapServer"
LAYER_ID = 5
CLASS_IDS = {
    "Pastagens (áridas, de baixa altitude)": "pastagens-aridas-baixa-altitude",
    "Pastagens muito Áridas": "pastagens-muito-aridas",
    "Dunas": "dunas", "Salgados": "salgados", "Regadio": "regadio",
    "Sequeiro": "sequeiro", "Afloramentos Rochosos": "afloramentos-rochosos",
}

def xy(value):
    if isinstance(value, list) and value and isinstance(value[0], (int, float)):
        return value[:2]
    return [xy(item) for item in value]

def hectares(geometry, geod):
    oriented = orient_polygons(geometry, exterior_cw=False)
    return abs(geod.geometry_area_perimeter(oriented)[0]) / 10_000

parser = argparse.ArgumentParser()
parser.add_argument("--geojson", help="Reviewed ArcGIS GeoJSON export; omit to fetch layer 5")
parser.add_argument("--layer-metadata", help="Reviewed layer metadata JSON; omit to fetch layer 5")
parser.add_argument("--output", required=True)
parser.add_argument("--retrieved-at")
args = parser.parse_args()
def fetch_json(url, params=None):
    target = f"{url}?{urlencode(params)}" if params else url
    with urlopen(Request(target, headers={"User-Agent": "Maio-Open-API/1.1"}), timeout=60) as response:
        return json.load(response)

if bool(args.geojson) != bool(args.layer_metadata):
    raise ValueError("Provide both --geojson and --layer-metadata, or neither")
if args.geojson:
    raw_bytes = Path(args.geojson).read_bytes()
    document = json.loads(raw_bytes)
    metadata = json.loads(Path(args.layer_metadata).read_text())
else:
    layer_url = f"{SOURCE_URL}/{LAYER_ID}"
    metadata = fetch_json(layer_url, {"f": "json"})
    ids_response = fetch_json(f"{layer_url}/query", {"where": "1=1", "returnIdsOnly": "true", "f": "json"})
    expected_ids = sorted(ids_response.get("objectIds", []))
    collected = []
    for start in range(0, len(expected_ids), 200):
        page_ids = expected_ids[start:start + 200]
        page = fetch_json(f"{layer_url}/query", {"objectIds": ",".join(map(str, page_ids)), "outFields": "*", "outSR": "4326", "returnZ": "false", "returnM": "false", "f": "geojson"})
        collected.extend(page.get("features", []))
    oid_field = next(field["name"] for field in metadata["fields"] if field["type"] == "esriFieldTypeOID")
    actual_ids = sorted(int(feature["properties"][oid_field]) for feature in collected)
    if actual_ids != expected_ids:
        raise ValueError("ArcGIS query did not return the complete stable object-ID set")
    document = {"type": "FeatureCollection", "features": collected}
    raw_bytes = json.dumps(document, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
geod = Geod(ellps="WGS84")
features, grouped = [], defaultdict(list)
for raw in document["features"]:
    source_id = str(raw["properties"]["FID"])
    label = raw["properties"]["Agricola"].strip()
    if label not in CLASS_IDS:
        raise ValueError(f"Unreviewed agricultural class: {label!r}")
    geometry_json = {"type": raw["geometry"]["type"], "coordinates": xy(raw["geometry"]["coordinates"])}
    geometry = shape(geometry_json)
    if not geometry.is_valid:
        raise ValueError(f"Invalid source geometry for FID {source_id}")
    grouped[label].append(geometry)
    features.append({
        "type": "Feature", "id": f"ingt-carta-agricola-maio-{source_id}",
        "geometry": mapping(orient_polygons(geometry, exterior_cw=False)),
        "properties": {
            "name": label, "classificationId": CLASS_IDS[label], "classification": label,
            "areaHectaresCalculated": round(hectares(geometry, geod), 6),
            "sourceAreaKm2": raw["properties"].get("Área_Km2"),
            "sourceRecordId": source_id, "sourceLayerId": LAYER_ID,
            "sourceAttributes": raw["properties"],
        },
    })
aggregates = []
for label, geometries in grouped.items():
    union = unary_union(geometries)
    aggregates.append({
        "classificationId": CLASS_IDS[label], "classification": label,
        "featureCount": len(geometries),
        "areaHectaresCalculated": round(hectares(union, geod), 6),
    })
aggregates.sort(key=lambda row: row["classificationId"])
all_geometries = [geometry for values in grouped.values() for geometry in values]
gross = sum(row["properties"]["areaHectaresCalculated"] for row in features)
unique = hectares(unary_union(all_geometries), geod)
retrieved = args.retrieved_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
output = {
    "source": {
        "id": "ingt-carta-agricola-maio", "title": "INGT — Carta Agrícola de Cabo Verde",
        "url": SOURCE_URL, "layerUrl": f"{SOURCE_URL}/{LAYER_ID}", "layerId": LAYER_ID,
        "layerName": metadata["name"], "attribution": "INGT — Instituto Nacional de Gestão do Território",
        "license": "Not specified by source", "licenseUrl": None,
        "sourceUpdatedAt": None, "referenceDate": None, "retrievedAt": retrieved,
        "serviceVersion": "10.71", "sourceCrs": "EPSG:4826", "publishedCrs": "OGC:CRS84",
        "checksum": hashlib.sha256(raw_bytes).hexdigest(),
    },
    "methodology": {
        "areaFieldAssessment": "Área_Km2 is not used for totals: 47 of 48 source records contain zero.",
        "calculatedAreaMethod": "Source-returned WGS84 polygons; geodesic area on the WGS84 ellipsoid with holes respected; square metres divided by 10,000 and reported as hectares.",
        "aggregationMethod": "Polygons are unioned within each classification before calculating classification area.",
        "overlapCaveat": "Different source classifications overlap. Gross classification totals must not be summed as unique island coverage.",
        "grossMappedAreaHectaresCalculated": round(gross, 6),
        "uniqueMappedAreaHectaresCalculated": round(unique, 6),
        "crossClassificationOverlapHectaresCalculated": round(gross - unique, 6),
    },
    "classifications": aggregates, "features": features,
}
Path(args.output).write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
