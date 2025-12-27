import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy the CSV parser from scenario-runner
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map(v => v.replace(/^"|"$/g, ''));
}

function parseCSV(csv: string): any[] {
  const lines = csv.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  const rows = lines.slice(1);

  console.log('Headers:', headers);

  return rows.map((row, rowIndex) => {
    const values = parseCSVLine(row);
    const obj: any = {};

    console.log(`\nRow ${rowIndex}:`, values);

    headers.forEach((header, i) => {
      let value = values[i] || '';
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      let canonicalField = header;
      if (normalizedHeader.includes('account') && (normalizedHeader.includes('number') || normalizedHeader.includes('code') || header.toLowerCase() === 'account')) {
        canonicalField = 'account_code';
        const match = value.match(/\((\d+)\)/);
        value = match ? match[1] : value;
        console.log(`  ${header} -> account_code: "${value}"`);
      } else if (normalizedHeader.includes('balance') || normalizedHeader === 'amount' ||
                 normalizedHeader === 'debit' || normalizedHeader === 'credit' ||
                 normalizedHeader.includes('base_currency')) {
        canonicalField = normalizedHeader.includes('base') ? 'amount' :
                        (normalizedHeader === 'net_balance' ? 'amount' : normalizedHeader);
        value = value.replace(/,/g, '').replace(/"/g, '');
        obj[canonicalField] = parseFloat(value) || 0;
        console.log(`  ${header} -> ${canonicalField}: ${obj[canonicalField]}`);
        return;
      }

      obj[canonicalField] = value.replace(/^"|"$/g, '');
    });

    console.log(`  Final object:`, obj);
    return obj;
  });
}

async function main() {
  const glPath = path.join(__dirname, '../data/scenarios/06-quickbooks-format/gl_balance.csv');
  const csv = await fs.readFile(glPath, 'utf-8');

  console.log('=== QuickBooks GL CSV ===\n');
  console.log('Raw CSV:');
  console.log(csv);
  console.log('\n=== Parsed Result ===\n');

  const parsed = parseCSV(csv);
  console.log('\nFinal parsed array:', JSON.stringify(parsed, null, 2));
}

main().catch(console.error);
