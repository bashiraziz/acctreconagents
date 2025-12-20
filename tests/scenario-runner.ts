/**
 * Automated Scenario Testing Framework
 *
 * This script:
 * 1. Loads all scenarios from data/scenarios/
 * 2. Sends each to the orchestrator API
 * 3. Compares actual results with expected_results.json
 * 4. Generates a test report
 *
 * Usage:
 *   npm run test:scenarios
 *   npm run test:scenarios -- --scenario=01-simple-balanced
 *   npm run test:scenarios -- --verbose
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SCENARIOS_DIR = path.join(__dirname, '../data/scenarios');
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:4100';
const MATERIALITY_THRESHOLD = parseFloat(process.env.MATERIALITY_THRESHOLD || '50');

// Test result tracking
interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  errors: string[];
  warnings: string[];
  reconciliations: ReconciliationResult[];
}

interface ReconciliationResult {
  account: string;
  period: string;
  expected: {
    variance: number;
    status: string;
    material: boolean;
  };
  actual: {
    variance: number;
    status: string;
    material: boolean;
  };
  match: boolean;
}

interface ScenarioData {
  name: string;
  path: string;
  glBalances: any[];
  subledgerBalances: any[];
  transactions?: any[];
  expectedResults: any;
}

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {
  scenario: args.find(arg => arg.startsWith('--scenario='))?.split('=')[1],
  verbose: args.includes('--verbose') || args.includes('-v'),
};

/**
 * Main test runner
 */
async function main() {
  console.log('🧪 Automated Scenario Testing Framework\n');
  console.log(`Orchestrator URL: ${ORCHESTRATOR_URL}`);
  console.log(`Materiality Threshold: $${MATERIALITY_THRESHOLD}\n`);

  try {
    // Load scenarios
    const scenarios = await loadScenarios();

    if (scenarios.length === 0) {
      console.error('❌ No scenarios found!');
      process.exit(1);
    }

    console.log(`Found ${scenarios.length} scenario(s) to test\n`);
    console.log('━'.repeat(80));

    // Run tests
    const results: TestResult[] = [];
    for (const scenario of scenarios) {
      const result = await runScenarioTest(scenario);
      results.push(result);

      // Print result
      printTestResult(result);
      console.log('━'.repeat(80));
    }

    // Print summary
    printSummary(results);

    // Exit with appropriate code
    const failedCount = results.filter(r => !r.passed).length;
    process.exit(failedCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Load all scenarios from disk
 */
async function loadScenarios(): Promise<ScenarioData[]> {
  const entries = await fs.readdir(SCENARIOS_DIR, { withFileTypes: true });
  const scenarioDirs = entries.filter(e => e.isDirectory() && /^\d{2}-/.test(e.name));

  const scenarios: ScenarioData[] = [];

  for (const dir of scenarioDirs) {
    // Skip if filtering by specific scenario
    if (options.scenario && !dir.name.includes(options.scenario)) {
      continue;
    }

    const scenarioPath = path.join(SCENARIOS_DIR, dir.name);

    try {
      const glPath = path.join(scenarioPath, 'gl_balance.csv');
      const subPath = path.join(scenarioPath, 'subledger_balance.csv');
      const txnPath = path.join(scenarioPath, 'transactions.csv');
      const expectedPath = path.join(scenarioPath, 'expected_results.json');

      // Read files
      const glBalances = await parseCSV(await fs.readFile(glPath, 'utf-8'));
      const subledgerBalances = await parseCSV(await fs.readFile(subPath, 'utf-8'));

      let transactions;
      try {
        transactions = await parseCSV(await fs.readFile(txnPath, 'utf-8'));
      } catch {
        transactions = undefined; // Optional file
      }

      const expectedResults = JSON.parse(await fs.readFile(expectedPath, 'utf-8'));

      scenarios.push({
        name: dir.name,
        path: scenarioPath,
        glBalances,
        subledgerBalances,
        transactions,
        expectedResults,
      });
    } catch (error) {
      console.warn(`⚠️  Skipping ${dir.name}: ${error.message}`);
    }
  }

  return scenarios.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Parse CSV file to JSON
 */
function parseCSV(csv: string): any[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1);

  return rows.map(row => {
    const values = row.split(',').map(v => v.trim());
    const obj: any = {};

    headers.forEach((header, i) => {
      const value = values[i];

      // Type conversion
      if (header === 'amount' || header === 'debit' || header === 'credit') {
        obj[header] = parseFloat(value) || 0;
      } else if (!isNaN(parseFloat(value)) && header.includes('amount')) {
        obj[header] = parseFloat(value);
      } else {
        obj[header] = value;
      }
    });

    return obj;
  });
}

/**
 * Run a single scenario test
 */
async function runScenarioTest(scenario: ScenarioData): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    scenario: scenario.name,
    passed: false,
    duration: 0,
    errors: [],
    warnings: [],
    reconciliations: [],
  };

  try {
    // Call orchestrator API
    const response = await fetch(`${ORCHESTRATOR_URL}/agent/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: `Reconcile scenario: ${scenario.name}`,
        payload: {
          glBalances: scenario.glBalances,
          subledgerBalances: scenario.subledgerBalances,
          transactions: scenario.transactions,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      result.errors.push(`API error (${response.status}): ${JSON.stringify(error)}`);
      result.duration = Date.now() - startTime;
      return result;
    }

    const apiResult = await response.json();
    const actualReconciliations = apiResult.toolOutput?.reconciliations || [];
    const expectedReconciliations = scenario.expectedResults.reconciliations || [];

    // Compare results
    const comparison = compareReconciliations(expectedReconciliations, actualReconciliations);
    result.reconciliations = comparison.results;
    result.errors.push(...comparison.errors);
    result.warnings.push(...comparison.warnings);
    result.passed = comparison.errors.length === 0;

  } catch (error) {
    result.errors.push(`Test execution failed: ${error.message}`);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Compare expected vs actual reconciliations
 */
function compareReconciliations(expected: any[], actual: any[]) {
  const results: ReconciliationResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check count
  if (expected.length !== actual.length) {
    errors.push(`Reconciliation count mismatch: expected ${expected.length}, got ${actual.length}`);
  }

  // Compare each reconciliation
  for (const exp of expected) {
    const act = actual.find(a =>
      a.account === exp.account &&
      (a.period === exp.period || !exp.period)
    );

    if (!act) {
      errors.push(`Missing reconciliation for account ${exp.account}, period ${exp.period}`);
      continue;
    }

    const varianceMatch = Math.abs(act.variance - exp.variance) < 0.01;
    const statusMatch = act.status === exp.status;
    const materialMatch = act.material === exp.material;
    const match = varianceMatch && statusMatch && materialMatch;

    if (!match) {
      if (!varianceMatch) {
        errors.push(
          `Variance mismatch for ${exp.account}: expected ${exp.variance}, got ${act.variance}`
        );
      }
      if (!statusMatch) {
        errors.push(
          `Status mismatch for ${exp.account}: expected "${exp.status}", got "${act.status}"`
        );
      }
      if (!materialMatch) {
        warnings.push(
          `Materiality mismatch for ${exp.account}: expected ${exp.material}, got ${act.material}`
        );
      }
    }

    results.push({
      account: exp.account,
      period: exp.period || 'unspecified',
      expected: {
        variance: exp.variance,
        status: exp.status,
        material: exp.material,
      },
      actual: {
        variance: act.variance,
        status: act.status,
        material: act.material,
      },
      match,
    });
  }

  return { results, errors, warnings };
}

/**
 * Print individual test result
 */
function printTestResult(result: TestResult) {
  const icon = result.passed ? '✅' : '❌';
  const status = result.passed ? 'PASSED' : 'FAILED';

  console.log(`\n${icon} ${result.scenario} - ${status} (${result.duration}ms)`);

  if (options.verbose || !result.passed) {
    // Print reconciliation details
    console.log('\nReconciliation Results:');
    for (const recon of result.reconciliations) {
      const matchIcon = recon.match ? '✓' : '✗';
      console.log(`  ${matchIcon} Account ${recon.account} (${recon.period})`);
      console.log(`     Expected: variance=${recon.expected.variance}, status=${recon.expected.status}`);
      console.log(`     Actual:   variance=${recon.actual.variance}, status=${recon.actual.status}`);
    }
  }

  // Print errors
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(err => console.log(`  ❌ ${err}`));
  }

  // Print warnings
  if (result.warnings.length > 0 && options.verbose) {
    console.log('\nWarnings:');
    result.warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
  }
}

/**
 * Print test summary
 */
function printSummary(results: TestResult[]) {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total:    ${total} scenarios`);
  console.log(`Passed:   ${passed} ✅`);
  console.log(`Failed:   ${failed} ❌`);
  console.log(`Duration: ${totalDuration}ms`);
  console.log('='.repeat(80));

  if (failed > 0) {
    console.log('\n❌ Some tests failed!');
    console.log('\nFailed scenarios:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.scenario}`);
    });
  } else {
    console.log('\n✅ All tests passed!');
  }
}

// Run tests
main().catch(console.error);
