# Maio business statistics — IAE 2024

61 aggregate records extracted from the supplied `Inquérito Anual Empresas - 2024.xls`. Reference year: **2024**, the latest year in this workbook; this is not a claim that no newer publication exists. Workbook attribution: INE Cabo Verde. The exact official publication URL, release date and reuse license remain unverified. Source metadata therefore uses `secondary-extract` / `needs-review`, not reviewed official publication.

## Access

- `/api/v1/collections/business-statistics/items` — GeoJSON with null geometry, stable statistical IDs and source-cell attribution. Sidebar: Business statistics.
- `/api/v1/datasets/business-demography/records?year=2024` — normalized indicators, using existing pagination, filters and ETags.
- `/api/v1/sources/iae-2024-user-workbook` — SHA-256 of original XLS, extraction timestamp and transformation metadata.

Existing mapped `businesses` are unchanged. The previously planned `business-demography` dataset now contains source records. No new route template is required. `WorkbookCell` is a reusable OpenAPI component; `DatasetRecord.sourceCell` and `displayName` are optional additions.

## Coverage and interpretation

Three 2024 totals (tables 1–3); legal form, accounting, size, chief's sex, employee sex and economic sector (tables 4–7, 11–14, 16–18, 20–22); companies by activity for island MA / Maio (table 8). National-only tables 9, 10, 15, 19 and 23 are excluded. Earlier years, growth rates and national shares are not imported. Original Portuguese category labels are retained beside stable codes.

Raw fractional survey estimates are preserved. UI values are rounded to match whole-number source formatting. `---` maps to null with `valueStatus=missing` and the original marker; no unverified suppression/zero meaning is assigned. Explicit source zeroes remain zeroes. Turnover units are **thousand-CVE**. Never sum overlapping totals and breakdowns, infer missing values by subtraction, treat chief's sex as employee sex, or allocate municipality totals to localities. Geometry and locality links remain null. Methodology text is retained; no Maio-specific confidence interval is inferred from national methodology.

## Reproduce

Install `xlrd==2.0.2` in an isolated Python environment, then run:

```sh
python apps/maio-api/scripts/import-business-statistics.py /path/to/source.xls
npm --workspace apps/maio-api run data:sync
npm --workspace apps/maio-api test
```

The importer checks the reviewed workbook SHA-256 before applying its explicit cell mapping. For a different edition, review its layout, labels, units and geography before changing the pin or adding an adapter. The original private filesystem path and workbook author metadata are not published. XLS is not served or copied into the public app; obtain the original supplied file to reproduce. Extraction is manual; automatic INE retrieval remains planned.
