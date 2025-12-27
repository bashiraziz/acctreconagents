/**
 * Test QuickBooks Parser Skill
 *
 * Validates the QuickBooks parser against scenario 06 data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseQuickBooks } from './quickbooks-parser/parse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🧪 Testing QuickBooks Parser Skill\n');

  try {
    // Load scenario 06 GL balance file
    const glPath = path.join(__dirname, '../data/scenarios/06-quickbooks-format/gl_balance.csv');
    const glContent = await fs.readFile(glPath, 'utf-8');

    console.log('📄 Input CSV (GL Balance):');
    console.log(glContent);
    console.log('━'.repeat(80));

    // Parse with QuickBooks skill
    const result = parseQuickBooks(glContent, 'gl_balance');

    // Display results
    console.log('\n✅ Parse Results:\n');
    console.log(`Accounts extracted: ${result.metadata.accountsExtracted}`);
    console.log(`Format confidence: ${Math.round(result.metadata.formatConfidence * 100)}%`);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log('\n🔄 Transformations Applied:');
    result.metadata.transformationsApplied.forEach(t => console.log(`  - ${t}`));

    console.log('\n📊 Parsed Data (Canonical Format):');
    console.log(JSON.stringify(result.data, null, 2));

    // Validate key accounts
    console.log('\n🔍 Validation:');
    const ap = result.data.find(r => r.account_code === '2000');
    const accrued = result.data.find(r => r.account_code === '2100');
    const inventory = result.data.find(r => r.account_code === '1400');
    const cogs = result.data.find(r => r.account_code === '5000');

    const checks = [
      { name: 'Accounts Payable (2000)', record: ap, expectedAmount: -52850, expectedPeriod: '2025-12' },
      { name: 'Accrued Expenses (2100)', record: accrued, expectedAmount: -8500, expectedPeriod: '2025-12' },
      { name: 'Inventory (1400)', record: inventory, expectedAmount: 125600, expectedPeriod: '2025-12' },
      { name: 'Cost of Goods Sold (5000)', record: cogs, expectedAmount: 89400, expectedPeriod: '2025-12' },
    ];

    let passed = 0;
    let failed = 0;

    for (const check of checks) {
      if (!check.record) {
        console.log(`  ❌ ${check.name} - NOT FOUND`);
        failed++;
        continue;
      }

      const amountMatch = check.record.amount === check.expectedAmount;
      const periodMatch = check.record.period === check.expectedPeriod;

      if (amountMatch && periodMatch) {
        console.log(`  ✅ ${check.name} - amount=${check.record.amount}, period=${check.record.period}`);
        passed++;
      } else {
        console.log(`  ❌ ${check.name} - MISMATCH`);
        console.log(`     Expected: amount=${check.expectedAmount}, period=${check.expectedPeriod}`);
        console.log(`     Got:      amount=${check.record.amount}, period=${check.record.period}`);
        failed++;
      }
    }

    console.log(`\n${'━'.repeat(80)}`);
    console.log(`Test Summary: ${passed}/${checks.length} passed`);

    if (failed === 0) {
      console.log('✅ All checks passed! QuickBooks parser is working correctly.');
      process.exit(0);
    } else {
      console.log(`❌ ${failed} checks failed.`);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
