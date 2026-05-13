// Quick exploration: read both Shida Kartli school xlsx files, print headers
// and the first 2 rows so we can map columns -> our schools schema.

import xlsx from 'xlsx';

const FILES = [
  'C:/Users/Administrator/Downloads/გამყოფი ხაზის შიდა ქართლი.xlsx',
  'C:/Users/Administrator/Downloads/მაღალმთიანი შიდა ქართლი.xlsx',
];

for (const path of FILES) {
  console.log('\n===', path.split('/').pop(), '===');
  const wb = xlsx.readFile(path);
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: null, raw: false });
    console.log(`Sheet "${name}" — ${rows.length} rows`);
    if (rows.length > 0) {
      console.log('Columns:', Object.keys(rows[0]));
      console.log('Row 1:', JSON.stringify(rows[0], null, 2));
      if (rows[1]) console.log('Row 2:', JSON.stringify(rows[1], null, 2));
    }
  }
}
