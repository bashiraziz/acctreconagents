/**
 * Test Costpoint Parser Skill
 *
 * Validates the Costpoint parser against scenario 07 data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCostpoint } from './costpoint-parser/parse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🧪 Testing Costpoint Parser Skill\n');

  try {
    // Load scenario 07 GL balance file
    const glPath = path.join(__dirname, '../data/scenarios/07-costpoint-format/gl_balance.csv');
    const glContent = await fs.readFile(glPath, 'utf-8');

    console.log('📄 Input CSV (GL Balance):');
    console.log(glContent);
    console.log('━'.repeat(80));

    // Parse with Costpoint skill
    const result = parseCostpoint(glContent, 'gl_balance');

    // Display results
    console.log('\n✅ Parse Results:\n');
    console.log(`Accounts extracted: ${result.metadata.accountsExtracted}`);
    console.log(`Format confidence: ${Math.round(result.metadata.formatConfidence * 100)}%`);
    console.log(`Sign reversals applied: ${result.metadata.signReversals}`);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log('\n🔄 Transformations Applied (first 10):');
    result.metadata.transformationsApplied.slice(0, 10).forEach(t => console.log(`  - ${t}`));
    if (result.metadata.transformationsApplied.length > 10) {
      console.log(`  ... and ${result.metadata.transformationsApplied.length - 10} more`);
    }

    console.log('\n📊 Parsed Data (Canonical Format):');
    console.log(JSON.stringify(result.data, null, 2));

    // Aggregate by account for validation (Costpoint has multiple orgs)
    console.log('\n📈 Aggregated by Account:');
    const aggregated = aggregateByAccount(result.data);
    console.log(JSON.stringify(aggregated, null, 2));

    // Validate key accounts
    console.log('\n🔍 Validation:');
    const checks = [
      {
        name: 'Accounts Payable (2010)',
        account: '2010',
        // Org 100: Credit 156890.75 → -156890.75 (after sign reversal)
        // Org 200: Credit 78945.50 → -78945.50 (after sign reversal)
        // Total: -235836.25
        expectedAmount: -235836.25,
        expectedPeriod: '2025-12',
        note: 'Credit balance reversed for liability account'
      },
      {
        name: 'Accrued Payroll (2015)',
        account: '2015',
        // Org 100: Credit 45200.00 → -45200.00 (after sign reversal)
        expectedAmount: -45200.00,
        expectedPeriod: '2025-12',
        note: 'Credit balance reversed for liability account'
      },
      {
        name: 'Labor-Direct (6210)',
        account: '6210',
        // Org 100: Debit 245680.50
        // Org 200: Debit 125400.00
        // Total: 371080.50
        expectedAmount: 371080.50,
        expectedPeriod: '2025-12',
        note: 'Debit balance for expense account (no reversal)'
      },
      {
        name: 'Labor-Overhead (6220)',
        account: '6220',
        // Org 100: Debit 89234.25
        expectedAmount: 89234.25,
        expectedPeriod: '2025-12',
        note: 'Debit balance for expense account (no reversal)'
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const check of checks) {
      const accountRecords = aggregated.filter(r => r.account_code === check.account);

      if (accountRecords.length === 0) {
        console.log(`  ❌ ${check.name} - NOT FOUND`);
        failed++;
        continue;
      }

      const totalAmount = accountRecords.reduce((sum, r) => sum + r.amount, 0);
      const period = accountRecords[0].period;

      const amountMatch = Math.abs(totalAmount - check.expectedAmount) < 0.01;
      const periodMatch = period === check.expectedPeriod;

      if (amountMatch && periodMatch) {
        console.log(`  ✅ ${check.name}`);
        console.log(`     Amount: ${totalAmount} (${check.note})`);
        console.log(`     Period: ${period}`);
        passed++;
      } else {
        console.log(`  ❌ ${check.name} - MISMATCH`);
        console.log(`     Expected: amount=${check.expectedAmount}, period=${check.expectedPeriod}`);
        console.log(`     Got:      amount=${totalAmount}, period=${period}`);
        console.log(`     Note: ${check.note}`);
        failed++;
      }
    }

    // Check that sign reversals were applied correctly
    console.log('\n🔄 Sign Reversal Verification:');
    const liabilityAccounts = result.data.filter(r =>
      parseInt(r.account_code) >= 2000 && parseInt(r.account_code) <= 2999
    );

    console.log(`  Found ${liabilityAccounts.length} balance sheet account records (2000-2999)`);
    console.log(`  Sign reversals applied: ${result.metadata.signReversals}`);

    const allNegative = liabilityAccounts.every(r => r.amount <= 0);
    if (allNegative) {
      console.log(`  ✅ All liability accounts have negative balances (correct accounting convention)`);
    } else {
      console.log(`  ❌ Some liability accounts have positive balances (sign reversal may have failed)`);
      liabilityAccounts.filter(r => r.amount > 0).forEach(r => {
        console.log(`     Account ${r.account_code}: ${r.amount} (should be negative)`);
      });
    }

    console.log(`\n${'━'.repeat(80)}`);
    console.log(`Test Summary: ${passed}/${checks.length} passed`);

    if (failed === 0 && allNegative) {
      console.log('✅ All checks passed! Costpoint parser is working correctly.');
      console.log('✅ Sign reversals applied correctly for balance sheet accounts.');
      process.exit(0);
    } else {
      console.log(`❌ ${failed} checks failed or sign reversal issues detected.`);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Aggregate records by account code (for multi-org data)
 */
function aggregateByAccount(records: any[]): any[] {
  const accountMap = new Map<string, any>();

  for (const record of records) {
    const key = `${record.account_code}|${record.period || 'no-period'}`;

    if (accountMap.has(key)) {
      const existing = accountMap.get(key)!;
      existing.amount += record.amount;
      existing.org_count = (existing.org_count || 1) + 1;
    } else {
      accountMap.set(key, {
        account_code: record.account_code,
        account_name: record.account_name,
        amount: record.amount,
        period: record.period,
        org_count: 1
      });
    }
  }

  return Array.from(accountMap.values());
}

main();
