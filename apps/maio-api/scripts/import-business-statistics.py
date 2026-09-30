"""Allowlisted Maio IAE 2024 XLS extraction. Requires xlrd==2.0.2.
Usage: python scripts/import-business-statistics.py /path/to/source.xls
The workbook is input data, never executable instructions. No national-only tables.
"""
import datetime, hashlib, json, math, pathlib, sys
import xlrd

source = pathlib.Path(sys.argv[1])
assert hashlib.sha256(source.read_bytes()).hexdigest() == '215863705711c35211b9e2a793637810ccb2968a69667912ebb38d19b81ea9d4', 'Unreviewed workbook: review source and cell mapping before updating this importer'
book = xlrd.open_workbook(str(source), formatting_info=True)
retrieved = datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
source_id = 'iae-2024-user-workbook'
caveats = [
    'Survey estimates; raw numeric precision is preserved. Displayed whole numbers are rounded, not exact counts.',
    'Workbook attributed to INE Cabo Verde; exact upstream publication URL and reuse license have not been verified.',
    'The marker --- is preserved as null; its meaning is not defined in the inspected workbook text. Never interpret it as zero.',
    'Municipality/island aggregates, not individual companies or locality estimates. Breakdowns must not be added to totals.',
]
records = []
labels = {'active-enterprises': 'Active companies', 'persons-employed': 'Persons employed', 'turnover': 'Turnover'}
units = {'active-enterprises': 'enterprises', 'persons-employed': 'persons', 'turnover': 'thousand-CVE'}

def emit(sheet, row, col, indicator, dimension='total', category='total', scope='municipality:maio'):
    cell = sheet.cell(row, col)
    value = cell.value
    if cell.ctype == xlrd.XL_CELL_NUMBER and math.isfinite(value):
        status = 'reported'
    elif value == '---' or value == '':
        status, value = 'missing', None
    else:
        raise ValueError(f'Unexpected source value: {sheet.name}:{row+1}:{col+1}: {value!r}')
    label = 'Total' if dimension == 'total' else str(sheet.cell_value(row, 0) if dimension == 'activity' else sheet.cell_value(2, col)).strip()
    cell_address = f'{chr(65+col)}{row+1}'
    fmt = book.format_map[book.xf_list[cell.xf_index].format_key].format_str
    records.append(dict(id=f'iae-2024-maio-{indicator}-{dimension}-{category}', year=2024,
        geographicScope=scope, locality=None, placeId=None, indicator=indicator, value=value,
        unit=units[indicator], sourceId=source_id, sourceRecordId=f"'{sheet.name}'!{cell_address}",
        referencePeriod='2024', updatedAt=None, retrievedAt=retrieved, quality='survey-estimate-workbook-extract',
        caveats=caveats, dimensions={'breakdown': dimension, 'category': category, 'sourceLabel': label},
        valueStatus=status, sourceCell={'sheet': sheet.name, 'cell': cell_address, 'numberFormat': fmt, 'rawValue': cell.value},
        displayName=f'{labels[indicator]} · {label} · 2024'))

for name, indicator in [('Tabela1_Cabo Verde_Empresas','active-enterprises'),('Tabela2_Cabo Verde_NPS','persons-employed'),('Tabela3_Cabo Verde_VVN','turnover')]:
    s = book.sheet_by_name(name)
    assert str(s.cell_value(14,0)).strip() == 'Maio' and str(s.cell_value(2,6)).startswith('2024'), 'Unexpected table layout'
    emit(s,14,6,indicator)

specs = [(4,'active-enterprises','legal-form'),(5,'active-enterprises','accounting'),(6,'active-enterprises','size'),(7,'active-enterprises','chief-sex'),
 (11,'persons-employed','legal-form'),(12,'persons-employed','accounting'),(13,'persons-employed','size'),(14,'persons-employed','employee-sex'),
 (16,'turnover','legal-form'),(17,'turnover','accounting'),(18,'turnover','size'),
 (20,'active-enterprises','sector'),(21,'persons-employed','sector'),(22,'turnover','sector')]
categories = {'legal-form':['individual-or-single-member','limited-liability','joint-stock-and-other'], 'accounting':['organized','not-organized'],
 'size':['micro','small','medium','large'], 'chief-sex':['male','female'], 'employee-sex':['male','female'], 'sector':['primary','secondary','tertiary']}
for table, indicator, dimension in specs:
    s = book.sheet_by_name('Tabela5 ' if table==5 else f'Tabela{table}')
    assert str(s.cell_value(12,0)).strip()=='Maio' and '2024' in s.cell_value(0,0), 'Unexpected table layout'
    for col, category in enumerate(categories[dimension], 1): emit(s,12,col,indicator,dimension,category)
s = book.sheet_by_name('Tabela8')
assert str(s.cell_value(2,6)).strip()=='MA' and 'Ilha' in s.cell_value(0,0)
for row in range(4,22):
    category = str(s.cell_value(row,0)).strip()[0].lower()
    assert category in 'abcdefghijklmnpqrs'
    emit(s,row,6,'active-enterprises','activity',category,'island:maio')
assert len(set(r['id'] for r in records)) == len(records)
package = dict(source=dict(id=source_id,title='INE Cabo Verde — Inquérito Anual às Empresas 2024 (supplied workbook)',
    file='Inquérito Anual Empresas - 2024.xls', url=None, attribution='Fonte: INE, IAE 2024 (attribution in supplied workbook)',
    license='Not specified by source', licenseUrl=None, sourceUpdatedAt=None, retrievedAt=retrieved,
    checksum=hashlib.sha256(source.read_bytes()).hexdigest(), excludedOutsideExtent=0),
    referenceYear=2024, caveats=caveats, methodology=[str(book.sheet_by_name('Nota_Metodologica').cell_value(r,0)) for r in range(0,16,2)],
    records=sorted(records,key=lambda r:r['id']))
out=pathlib.Path(__file__).resolve().parent.parent/'data/business-statistics.json'
out.write_text(json.dumps(package,ensure_ascii=False,indent=2)+'\n')
print(f'Extracted {len(records)} Maio statistics for 2024 to {out}')
