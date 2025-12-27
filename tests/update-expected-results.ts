/**
 * Update Expected Results Helper
 *
 * This script runs reconciliations and shows you the actual results
 * so you can update expected_results.json files.
 *
 * Usage:
 *   npx tsx update-expected-results.ts --scenario=03-timing-differences
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCENARIOS_DIR = path.join(__dirname, '../data/scenarios');
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://127.0.0.1:4100';

// Parse args
const args = process.argv.slice(2);
const scenarioArg = args.find(arg => arg.startsWith('--scenario='));
const scenarioFilter = scenarioArg?.split('=')[1];

async function main() {
  console.log('🔍 Update Expected Results Helper\n');
  console.log(`Orchestrator: ${ORCHESTRATOR_URL}\n`);

  if (!scenarioFilter) {
    console.error('❌ Please specify --scenario=NAME');
    console.log('\nUsage:');
    console.log('  npx tsx update-expected-results.ts --scenario=03-timing-differences');
    process.exit(1);
  }

  const entries = await fs.readdir(SCENARIOS_DIR, { withFileTypes: true });
  const scenarioDirs = entries.filter(e =>
    e.isDirectory() &&
    /^\d{2}-/.test(e.name) &&
    e.name.includes(scenarioFilter)
  );

  if (scenarioDirs.length === 0) {
    console.error(`❌ No scenario found matching: ${scenarioFilter}`);
    process.exit(1);
  }

  for (const dir of scenarioDirs) {
    await processScenario(dir.name);
  }
}

async function processScenario(scenarioName: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Scenario: ${scenarioName}`);
  console.log('='.repeat(80));

  const scenarioPath = path.join(SCENARIOS_DIR, scenarioName);

  try {
    // Read CSV files
    const glPath = path.join(scenarioPath, 'gl_balance.csv');
    const subPath = path.join(scenarioPath, 'subledger_balance.csv');

    const glBalances = parseCSV(await fs.readFile(glPath, 'utf-8'));
    const subledgerBalances = parseCSV(await fs.readFile(subPath, 'utf-8'));

    // Call orchestrator
    console.log('\n📡 Calling orchestrator...');
    const response = await fetch(`${ORCHESTRATOR_URL}/agent/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: `Reconcile scenario: ${scenarioName}`,
        payload: {
          glBalances,
          subledgerBalances,
        },
      }),
    });

    if (!response.ok) {
      console.error(`❌ API error: ${response.status}`);
      return;
    }

    const result = await response.json();
    const reconciliations = result.toolOutput?.reconciliations || [];

    if (reconciliations.length === 0) {
      console.log('\n⚠️  No reconciliations returned');
      return;
    }

    // Display results
    console.log('\n📊 Actual Reconciliation Results:\n');

    for (const recon of reconciliations) {
      console.log(`Account: ${recon.account}`);
      console.log(`  Period: ${recon.period || 'unspecified'}`);
      console.log(`  GL Balance: ${recon.glBalance}`);
      console.log(`  Subledger Balance: ${recon.subledgerBalance}`);
      console.log(`  Variance: ${recon.variance}`);
      console.log(`  Status: ${recon.status}`);
      console.log(`  Material: ${recon.material}`);
      console.log('');
    }

    // Generate expected results JSON
    console.log('📝 Suggested expected_results.json:\n');

    const expected = {
      scenario: scenarioName,
      description: `Update this description`,
      materiality_threshold: 50,
      reconciliations: reconciliations.map((r: any) => ({
        account: r.account,
        period: r.period || '2025-12',
        glBalance: r.glBalance,
        subledgerBalance: r.subledgerBalance,
        variance: r.variance,
        status: r.status,
        material: r.material,
        notes: r.material ? ['Material variance'] : ['In balance'],
      })),
      gemini_agent_expectations: {
        validation: {
          isValid: true,
          confidence: '>= 0.7',
        },
        analysis: {
          riskLevel: reconciliations.some((r: any) => r.material) ? 'medium' : 'low',
          materialVariances: reconciliations
            .filter((r: any) => r.material)
            .map((r: any) => ({
              account: r.account,
              variance: r.variance,
            })),
        },
        report: {
          should_not_contain: ['consider automation', 'implement AI'],
        },
      },
    };

    console.log(JSON.stringify(expected, null, 2));

    // Save option
    console.log('\n💾 To save this, run:');
    console.log(`cat > "${path.join(scenarioPath, 'expected_results.json')}" << 'EOF'`);
    console.log(JSON.stringify(expected, null, 2));
    console.log('EOF');

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

function parseCSV(csv: string): any[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1);

  return rows
    .filter(row => row.trim())
    .map(row => {
      const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/,/g, ''));
      const obj: any = {};

      headers.forEach((header, i) => {
        const value = values[i];

        // Type conversion
        if (header === 'amount' || header.toLowerCase().includes('balance')) {
          obj[header] = parseFloat(value.replace(/,/g, '')) || 0;
        } else if (header === 'debit' || header === 'credit') {
          obj[header] = parseFloat(value.replace(/,/g, '')) || 0;
        } else {
          obj[header] = value;
        }
      });

      return obj;
    });
}

main().catch(console.error);
