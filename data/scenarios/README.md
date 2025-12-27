# Test Data Scenarios

## Overview
This directory contains comprehensive test scenarios for the accounting reconciliation system. Each scenario is designed to test specific functionality, edge cases, or business rules.

## Directory Structure
```
scenarios/
├── README.md (this file)
├── SYSTEM_FORMATS_GUIDE.md      # Guide to different accounting system formats
├── 01-simple-balanced/          # Perfect reconciliation
├── 02-material-variance/        # Duplicate invoice error
├── 03-timing-differences/       # Period cutoff issues
├── 04-roll-forward-multi-period/# Multi-period reconciliation
├── 05-missing-subledger-data/   # Missing subledger entries
├── 06-quickbooks-format/        # QuickBooks export format
├── 07-costpoint-format/         # Deltek Costpoint format (government)
├── 08-netsuite-format/          # NetSuite multi-currency format
├── 09-multiple-variance-types/  # Mixed variance testing
├── 10-systematic-errors/        # Pattern detection testing
└── XX-scenario-name/            # Additional scenarios
```

## Scenario Standards

### Each Scenario Must Include:

#### 1. README.md
Comprehensive documentation including:
- **Purpose**: What this scenario tests
- **Scenario Description**: Detailed explanation of the situation
- **Accounting Period**: Time period covered
- **Beginning Balances**: Starting position (if applicable)
- **Activity**: Transactions that occurred
- **Ending Balances**: Expected final position
- **Expected Results**: What the reconciliation should produce
- **Agent Expected Behavior**: How AI agents should respond
- **Test Assertions**: Programmatic validation checks
- **Resolution Steps**: How to fix issues (if variance scenario)

#### 2. Data Files
- `gl_balance.csv` - General Ledger balances
- `subledger_balance.csv` - Detailed subledger records
- `transactions.csv` - (Optional) Period activity
- `expected_results.json` - Expected reconciliation output

#### 3. File Formats

**GL Balance CSV:**
```csv
account_code,account_name,period,currency,amount
20100,Accounts Payable Control,2025-10,USD,-1185000.00
```

**Subledger Balance CSV:**
```csv
vendor,invoice_number,invoice_date,due_date,aging_bucket,currency,amount,account_code,period
Acme Corp,INV-001,2025-10-01,2025-11-01,Current,USD,-500000.00,20100,2025-10
```

**Transactions CSV:**
```csv
account_code,booked_at,debit,credit,amount,narrative,source_period
20100,2025-10-05,0,335000,-335000,Invoice INV-55490 received,2025-10
```

**Expected Results JSON:**
```json
{
  "scenario": "01-simple-balanced",
  "description": "Description of what this tests",
  "materiality_threshold": 50,
  "reconciliations": [
    {
      "account": "20100",
      "glBalance": -1185000,
      "subledgerBalance": -1185000,
      "variance": 0,
      "status": "balanced",
      "material": false
    }
  ],
  "gemini_agent_expectations": {
    "validation": { "isValid": true },
    "analysis": { "riskLevel": "low" },
    "investigation": { "investigations": [] },
    "report": { "should_contain": ["in balance"] }
  }
}
```

## Accounting Conventions

### Sign Conventions
- **Assets**: Positive = Debit balance (increase), Negative = Credit balance (decrease)
- **Liabilities**: Negative = Credit balance (increase), Positive = Debit balance (decrease)
- **Equity**: Negative = Credit balance (increase), Positive = Debit balance (decrease)
- **Revenue**: Negative = Credit balance (increase)
- **Expenses**: Positive = Debit balance (increase)

For Accounts Payable (Liability - Account 20100):
- New invoices: **Negative** amounts (increase liability)
- Payments: **Positive** amounts (decrease liability)
- Ending balance: Usually **negative** (credit balance)

### Period Format
Use ISO 8601 year-month format: `YYYY-MM` (e.g., `2025-10`)

### Amount Format
- No thousands separators in CSV files
- Use negative sign for credits
- Two decimal places: `-1185000.00`

## Scenario Categories

### 1. Balanced Scenarios (01-series)
Perfect reconciliations where GL = Subledger
- **01-simple-balanced**: Basic functionality, data flow, agent responses

### 2. Variance Scenarios (02-series)
Material variances requiring investigation
- **02-material-variance**: Duplicate invoice detection
- **03-timing-differences**: Period cutoff issues
- Tests: Error detection, root cause analysis, investigation logic

### 3. Complex Scenarios (04-series)
Multi-period, roll-forwards, adjustments
- **04-roll-forward-multi-period**: Period-over-period logic, opening balance calculations
- Tests: Time-series reconciliation

### 4. Edge Cases (05-series)
Boundary conditions, unusual situations
- **05-missing-subledger-data**: Incomplete subledger entries
- Tests: System robustness, error handling

### 5. System Format Scenarios (06-08 series)
Real-world accounting system export formats
- **06-quickbooks-format**: Small business accounting (account extraction, comma parsing)
- **07-costpoint-format**: Government contract accounting (sign reversal critical!)
- **08-netsuite-format**: Enterprise ERP (multi-currency, multi-dimensional)
- Tests: Format compatibility, sign conventions, currency handling

**📖 See [SYSTEM_FORMATS_GUIDE.md](SYSTEM_FORMATS_GUIDE.md) for detailed comparison of accounting system formats.**

### 6. Variance Analysis Scenarios (09-10 series)
Testing variance detection and AI investigation capabilities
- **09-multiple-variance-types**: Mixed variances (duplicate, missing, amount errors)
- **10-systematic-errors**: Pattern detection (interface failures, calculation errors)
- Tests: Variance detection, root cause analysis, pattern recognition, AI investigation quality

**🔍 These scenarios test the AI's ability to analyze WHY variances exist, not just detect THAT they exist.**

## Creating New Scenarios

### Step 1: Plan the Scenario
1. What business rule or error are you testing?
2. What should the system detect?
3. What action should be recommended?

### Step 2: Calculate the Numbers
1. Start with GL balances (the "truth")
2. Create subledger that explains GL (or contains error)
3. Verify calculations manually
4. Document the math in README

### Step 3: Create Files
```bash
mkdir data/scenarios/XX-your-scenario-name
cd data/scenarios/XX-your-scenario-name

# Create the files:
touch README.md
touch gl_balance.csv
touch subledger_balance.csv
touch transactions.csv  # optional
touch expected_results.json
```

### Step 4: Document Expected Behavior
Be specific about what Gemini agents should say:
- Validation: What warnings/errors?
- Analysis: What patterns detected?
- Investigation: What causes identified?
- Report: What recommendations?

## Testing Scenarios

### Manual Testing
1. Upload scenario files to web UI
2. Map columns
3. Run reconciliation
4. Compare actual results to `expected_results.json`
5. Review Gemini agent outputs

### Automated Testing (Future)
```bash
npm run test:scenarios
```

Should automatically:
- Load each scenario
- Run reconciliation
- Assert expected results
- Validate agent outputs

## Best Practices

### ✅ DO:
- Include detailed narrative in README
- Show all calculations
- Explain the "why" behind the scenario
- Document expected agent responses
- Use realistic vendor names and amounts
- Include resolution steps for error scenarios

### ❌ DON'T:
- Create scenarios without documentation
- Use arbitrary numbers without explanation
- Skip the expected_results.json file
- Create scenarios that test multiple unrelated things
- Use real company data (anonymize first)

## Scenario Naming Convention

```
XX-brief-descriptive-name/
```

Where:
- `XX` = Two-digit number (01, 02, 03...)
- `brief-descriptive-name` = lowercase with hyphens
- Examples:
  - `01-simple-balanced`
  - `02-material-variance`
  - `03-timing-differences`
  - `04-roll-forward-multi-period`
  - `05-missing-subledger-data`

## Materiality Threshold

Default: **$50 USD**

Variances >= $50 are flagged as "material" and trigger investigation.

## Questions?

See the examples in:
- `01-simple-balanced/` - Perfect reconciliation template
- `02-material-variance/` - Error scenario template

Or refer to:
- `/specs/requirements/` - Business requirements
- `/specs/data-dictionary.md` - Field definitions
- `/specs/reconciliation-logic.md` - Algorithm details
