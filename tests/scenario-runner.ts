/**
 * Automated Scenario Testing Framework
 *
 * This script:
 * 1. Loads all scenarios from data/scenarios/
 * 2. Uses system-specific parsers (QuickBooks, Costpoint, NetSuite) for scenarios 06-08
 * 3. Sends each to the orchestrator API
 * 4. Compares actual results with expected_results.json
 * 5. Generates a test report
 *
 * Parser Selection:
 * - 06-quickbooks-format → QuickBooks Parser
 * - 07-costpoint-format → Costpoint Parser
 * - 08-netsuite-format → NetSuite Parser
 * - Other scenarios → Legacy universal parser
 *
 * Usage:
 *   npm run test:scenarios
 *   npm run test:scenarios -- --scenario=06-quickbooks
 *   npm run test:scenarios -- --verbose
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { validateAIBehavior, type AIValidationResult } from './ai-behavior-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SCENARIOS_DIR = path.join(__dirname, '../data/scenarios');
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://127.0.0.1:4100';
const MATERIALITY_THRESHOLD = parseFloat(process.env.MATERIALITY_THRESHOLD || '50');

// Test result tracking
interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  errors: string[];
  warnings: string[];
  reconciliations: ReconciliationResult[];
  aiValidation?: AIValidationResult;
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
 * Select appropriate parser based on scenario name
 */
async function selectParser(scenarioName: string) {
  if (scenarioName.includes('quickbooks')) {
    const { parseQuickBooks } = await import('../skills/quickbooks-parser/parse.ts');
    return {
      name: 'QuickBooks',
      parse: (csv: string) => parseQuickBooks(csv, 'gl_balance').data
    };
  } else if (scenarioName.includes('costpoint')) {
    const { parseCostpoint } = await import('../skills/costpoint-parser/parse.ts');
    return {
      name: 'Costpoint',
      parse: (csv: string) => parseCostpoint(csv, 'gl_balance').data
    };
  } else if (scenarioName.includes('netsuite')) {
    const { parseNetSuite } = await import('../skills/netsuite-parser/parse.ts');
    return {
      name: 'NetSuite',
      parse: (csv: string) => parseNetSuite(csv, 'gl_balance', true).data
    };
  } else {
    // Fallback to legacy parseCSV for other scenarios
    return {
      name: 'Legacy',
      parse: (csv: string) => parseCSV(csv)
    };
  }
}

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

      // Select appropriate parser for this scenario
      const parser = await selectParser(dir.name);

      if (options.verbose) {
        console.log(`Using ${parser.name} parser for ${dir.name}`);
      }

      // Read files
      const glBalances = parser.parse(await fs.readFile(glPath, 'utf-8'));
      const subledgerBalances = parser.parse(await fs.readFile(subPath, 'utf-8'));

      let transactions;
      try {
        transactions = parser.parse(await fs.readFile(txnPath, 'utf-8'));
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
 * Handles quoted values, comma-formatted numbers, and special column names
 */
function parseCSV(csv: string): any[] {
  const lines = csv.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse headers - handle quotes
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  const rows = lines.slice(1);

  return rows.map(row => {
    const values = parseCSVLine(row);
    const obj: any = {};

    headers.forEach((header, i) => {
      let value = values[i] || '';

      // Normalize header name
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      // Map common variations to canonical names
      let canonicalField = header;
      if (normalizedHeader.includes('account') && (normalizedHeader.includes('number') || normalizedHeader.includes('code') || normalizedHeader === 'account')) {
        canonicalField = 'account_code';
        // Extract account code from formats like "Accounts Payable (2000)"
        const match = value.match(/\((\d+)\)/);
        value = match ? match[1] : value;
      } else if (normalizedHeader.includes('balance') || normalizedHeader === 'amount' ||
                 normalizedHeader === 'debit' || normalizedHeader === 'credit' ||
                 normalizedHeader.includes('base_currency')) {
        // Always map to 'amount' for consistency with orchestrator
        canonicalField = 'amount';
        // Remove commas and parse as number
        value = value.replace(/,/g, '').replace(/"/g, '');
        obj[canonicalField] = parseFloat(value) || 0;
        return; // Skip the string assignment below
      } else if (normalizedHeader.includes('period') || normalizedHeader === 'fiscal_year' || normalizedHeader.includes('as_of')) {
        // Map period-related fields
        canonicalField = 'period';
        // Try to convert to YYYY-MM format if it's a date
        if (value.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
          // US date format: MM/DD/YYYY -> YYYY-MM
          const parts = value.split('/');
          if (parts.length === 3) {
            value = `${parts[2]}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      obj[canonicalField] = value.replace(/^"|"$/g, ''); // Remove surrounding quotes
    });

    return obj;
  });
}

/**
 * Parse a single CSV line handling quoted values properly
 */
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

    // Compare reconciliation results
    const comparison = compareReconciliations(expectedReconciliations, actualReconciliations);
    result.reconciliations = comparison.results;
    result.errors.push(...comparison.errors);
    result.warnings.push(...comparison.warnings);

    // Validate AI agent behavior (if expectations exist)
    if (scenario.expectedResults.gemini_agent_expectations) {
      const aiValidation = validateAIBehavior(
        apiResult.geminiAgents || {},
        scenario.expectedResults.gemini_agent_expectations
      );
      result.aiValidation = aiValidation;

      if (!aiValidation.passed) {
        result.warnings.push(
          `AI behavior validation score: ${aiValidation.score}% (threshold: 70%)`
        );
      }

      // Add failed AI checks as warnings
      aiValidation.checks
        .filter(check => !check.passed)
        .forEach(check => {
          result.warnings.push(`AI: ${check.category} - ${check.check}: ${check.details || 'Failed'}`);
        });
    }

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

  // Print AI validation results
  if (result.aiValidation && options.verbose) {
    console.log('\nAI Behavior Validation:');
    console.log(`  Score: ${result.aiValidation.score}% (${result.aiValidation.passed ? '✅ PASSED' : '❌ FAILED'})`);

    if (options.verbose) {
      console.log('\n  Checks:');
      result.aiValidation.checks.forEach(check => {
        const icon = check.passed ? '✓' : '✗';
        console.log(`    ${icon} [${check.category}] ${check.check}`);
        if (check.details) {
          console.log(`      → ${check.details}`);
        }
      });
    }
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
