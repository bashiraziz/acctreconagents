/**
 * Test NetSuite Parser Skill
 *
 * Validates the NetSuite parser against scenario 08 data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseNetSuite } from './netsuite-parser/parse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🧪 Testing NetSuite Parser Skill\n');

  try {
    // Load scenario 08 GL balance file
    const glPath = path.join(__dirname, '../data/scenarios/08-netsuite-format/gl_balance.csv');
    const glContent = await fs.readFile(glPath, 'utf-8');

    console.log('📄 Input CSV (GL Balance):');
    console.log(glContent);
    console.log('━'.repeat(80));

    // Parse with NetSuite skill (with aggregation)
    const result = parseNetSuite(glContent, 'gl_balance', true);

    // Display results
    console.log('\n✅ Parse Results:\n');
    console.log(`Accounts extracted: ${result.metadata.accountsExtracted}`);
    console.log(`Format confidence: ${Math.round(result.metadata.formatConfidence * 100)}%`);
    console.log(`Dimensional records: ${result.metadata.dimensionalRecords}`);
    console.log(`Aggregated to: ${result.metadata.aggregatedRecords} accounts`);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log('\n🔄 Transformations Applied (first 15):');
    result.metadata.transformationsApplied.slice(0, 15).forEach(t => console.log(`  - ${t}`));
    if (result.metadata.transformationsApplied.length > 15) {
      console.log(`  ... and ${result.metadata.transformationsApplied.length - 15} more`);
    }

    console.log('\n📊 Parsed Data (Canonical Format - Aggregated):');
    console.log(JSON.stringify(result.data, null, 2));

    // Validate key accounts
    console.log('\n🔍 Validation:');
    const checks = [
      {
        name: 'Accounts Payable (2000)',
        account: '2000',
        // US: -125450.75
        // UK: -19812.00 (converted from GBP)
        // Total: -145262.75
        expectedAmount: -145262.75,
        expectedPeriod: '2025-12',
        note: 'Aggregated across US and UK subsidiaries (multi-currency)'
      },
      {
        name: 'Accrued Liabilities (2100)',
        account: '2100',
        // US Finance: -32500.00
        // US Operations: -18750.00
        // Total: -51250.00
        expectedAmount: -51250.00,
        expectedPeriod: '2025-12',
        note: 'Aggregated across Finance and Operations departments'
      },
      {
        name: 'Accounts Receivable (1200)',
        account: '1200',
        // US Sales: 245600.00
        expectedAmount: 245600.00,
        expectedPeriod: '2025-12',
        note: 'Asset account with positive balance'
      },
      {
        name: 'Cost of Sales (5000)',
        account: '5000',
        // US Operations: 156890.50
        expectedAmount: 156890.50,
        expectedPeriod: '2025-12',
        note: 'Expense account with positive balance'
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const check of checks) {
      const record = result.data.find(r => r.account_code === check.account);

      if (!record) {
        console.log(`  ❌ ${check.name} - NOT FOUND`);
        failed++;
        continue;
      }

      const amountMatch = Math.abs(record.amount - check.expectedAmount) < 0.01;
      const periodMatch = record.period === check.expectedPeriod;

      if (amountMatch && periodMatch) {
        console.log(`  ✅ ${check.name}`);
        console.log(`     Amount: ${record.amount}`);
        console.log(`     Period: ${record.period}`);
        console.log(`     Note: ${check.note}`);
        passed++;
      } else {
        console.log(`  ❌ ${check.name} - MISMATCH`);
        console.log(`     Expected: amount=${check.expectedAmount}, period=${check.expectedPeriod}`);
        console.log(`     Got:      amount=${record.amount}, period=${record.period}`);
        console.log(`     Note: ${check.note}`);
        failed++;
      }
    }

    // Check aggregation
    console.log('\n📈 Dimensional Aggregation Verification:');
    console.log(`  Original records (with dimensions): ${result.metadata.dimensionalRecords}`);
    console.log(`  Aggregated accounts: ${result.metadata.aggregatedRecords}`);

    if (result.metadata.dimensionalRecords > result.metadata.aggregatedRecords) {
      console.log(`  ✅ Successfully aggregated ${result.metadata.dimensionalRecords} dimensional records into ${result.metadata.aggregatedRecords} account balances`);
    } else if (result.metadata.dimensionalRecords === 0) {
      console.log(`  ⚠️  No dimensional data detected (may not have Department/Subsidiary columns)`);
    } else {
      console.log(`  ⚠️  No aggregation occurred`);
    }

    // Check multi-currency handling
    console.log('\n💱 Multi-Currency Verification:');
    const hasForeignCurrency = glContent.includes('Amount (Foreign Currency)') &&
                                glContent.includes('Amount (Base Currency)');
    if (hasForeignCurrency) {
      console.log(`  ✅ Detected multi-currency format with base currency column`);
      console.log(`  ✅ Parser should have used "Amount (Base Currency)" for consolidation`);
    }

    console.log(`\n${'━'.repeat(80)}`);
    console.log(`Test Summary: ${passed}/${checks.length} passed`);

    if (failed === 0) {
      console.log('✅ All checks passed! NetSuite parser is working correctly.');
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
