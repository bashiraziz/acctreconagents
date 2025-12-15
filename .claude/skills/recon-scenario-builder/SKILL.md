---
name: recon-scenario-builder
description: Create comprehensive reconciliation test scenarios with GL balances, subledger details, transactions, and documentation. Use when building new test cases, documenting variance examples, or creating reconciliation scenarios.
allowed-tools: Write, Read, Glob, Grep
---

# Reconciliation Scenario Builder

Creates complete, standards-compliant test scenarios for the accounting reconciliation system.

## When to use this Skill

Invoke this Skill when you need to:
- Create a new reconciliation test scenario
- Document a specific variance pattern or error condition
- Build test data for a new edge case
- Add examples for training or demonstration
- Create scenarios based on real-world issues encountered

## What this Skill produces

A complete scenario directory containing:
1. **README.md** - Comprehensive narrative with:
   - Scenario purpose and description
   - Beginning balances
   - Transaction activity with dates
   - Ending balance calculations (showing the math!)
   - Expected reconciliation results
   - Expected Gemini agent behavior
   - Test assertions (code snippets)
   - Resolution steps (for error scenarios)

2. **gl_balance.csv** - General Ledger balances
   - Proper sign conventions (liabilities negative)
   - Includes period field
   - Currency specified

3. **subledger_balance.csv** - Supporting detail
   - Invoice/vendor level detail
   - Includes period field
   - Proper sign conventions
   - May contain errors (duplicates, missing data) for variance scenarios

4. **transactions.csv** - Complete activity log
   - Opening balance entries
   - All invoices, payments, accruals
   - Journal entries (including manual/problem entries)
   - Chronologically organized
   - Clear narratives with invoice/check numbers

5. **expected_results.json** - Test assertions
   - Expected variance amounts
   - Status (balanced, material_variance, etc.)
   - Agent behavior expectations
   - Test validation rules

## Standards to follow

### Directory naming
```
XX-brief-descriptive-name/
```
Where XX is a two-digit number (06, 07, 08...) and name uses lowercase with hyphens.

### Sign conventions (CRITICAL!)
- **Assets**: Positive = Debit (increase), Negative = Credit (decrease)
- **Liabilities** (Accounts Payable, Accrued Expenses): **NEGATIVE = Credit balance (increase)**
- **New AP invoices**: Negative amounts (increase liability)
- **Payments**: Positive amounts (decrease liability)

### CSV format requirements
- No thousands separators
- Two decimal places: `-1185000.00`
- Period format: `YYYY-MM` (e.g., `2025-10`)
- **Always include `period` field** in GL and subledger CSVs
- UTF-8 encoding

### Account codes in use
- **20100**: Accounts Payable Control (liability, normally credit/negative)
- **22010**: Accrued Expenses (liability, normally credit/negative)

### Materiality threshold
- Default: **$50 USD**
- Variances >= $50 are "material_variance"
- Variances < $50 are "immaterial_variance"
- Variance = $0 is "balanced"

## Process for creating a scenario

### Step 1: Understand the requirement
Ask clarifying questions:
- What type of scenario? (balanced, variance, timing issue, etc.)
- What accounts involved?
- What period(s)?
- What's the error condition or variance?
- What should agents detect?

### Step 2: Design the scenario
Calculate the numbers:
1. Start with **ending GL balances** (the "truth")
2. Design **subledger detail** that either:
   - Matches GL perfectly (balanced scenario)
   - Contains an error creating variance (error scenario)
3. Create **transaction log** showing all activity
4. **Show all calculations** in README
5. Verify the math manually!

### Step 3: Create the directory
```bash
mkdir -p data/scenarios/XX-scenario-name
```

Choose next available number (check existing scenarios).

### Step 4: Write README.md first
The README drives everything. Include:

**Required sections**:
- Purpose
- Scenario Description
- Accounting Period
- Beginning Balances (if applicable)
- Activity During Period (with dates and amounts)
- Ending Balances (with calculations!)
- Expected Reconciliation Results
- Agent Expected Behavior (for all 4 agents)
- Test Assertions (code)
- Resolution Steps (for error scenarios)

**Show your work**:
```markdown
### Expected GL Balances
| Account | Ending Balance | Calculation |
|---------|----------------|-------------|
| 20100   | -$1,185,000    | -750k - 335k - 420k + 150k + 200k = -1,185k |
```

### Step 5: Generate CSV files

**gl_balance.csv format**:
```csv
account_code,account_name,period,currency,amount
20100,Accounts Payable Control,2025-10,USD,-1185000.00
```

**subledger_balance.csv format**:
```csv
vendor,invoice_number,invoice_date,due_date,aging_bucket,currency,amount,account_code,period
Acme Corp,INV-001,2025-10-05,2025-11-04,Current,USD,-500000.00,20100,2025-10
```

**transactions.csv format** (if needed):
```csv
account_code,booked_at,debit,credit,amount,narrative,source_period
20100,2025-10-01,0,0,0,Opening balance October 2025,2025-10
20100,2025-10-05,0,335000,-335000,Invoice INV-001 - Vendor Name,2025-10
20100,2025-10-10,150000,0,150000,Payment CHK-001 - Vendor Name,2025-10
```

### Step 6: Create expected_results.json

Document what the reconciliation should produce:

```json
{
  "scenario": "XX-scenario-name",
  "description": "Brief description",
  "materiality_threshold": 50,
  "reconciliations": [
    {
      "account": "20100",
      "period": "2025-10",
      "glBalance": -1185000,
      "subledgerBalance": -1185000,
      "variance": 0,
      "status": "balanced",
      "material": false
    }
  ],
  "gemini_agent_expectations": {
    "validation": {
      "isValid": true,
      "confidence": ">= 0.9"
    },
    "analysis": {
      "riskLevel": "low",
      "materialVariances": []
    },
    "investigation": {
      "investigations": []
    },
    "report": {
      "should_contain": ["in balance", "no issues"]
    }
  }
}
```

## Common scenario types to create

### Balanced scenarios
- Perfect reconciliation
- Multi-period balanced
- Multiple accounts balanced
- **Focus**: Verifying system works correctly

### Variance scenarios (most useful!)
- **Duplicate entries**: Invoice entered twice
- **Missing entries**: Invoice in GL, not in subledger (or vice versa)
- **Timing differences**: Transaction in wrong period
- **Manual journal entries**: GL entry without subledger support
- **Data extraction failures**: Incomplete subledger export
- **Rounding differences**: Small calculation variances
- **Currency mismatches**: Exchange rate issues

### Complex scenarios
- Multi-period roll-forward
- Multiple accounts with mixed results (some balanced, some not)
- Prior period adjustments
- Accrual reversals
- Mass payments/invoices

## Templates to reference

**For balanced scenarios**: See `data/scenarios/01-simple-balanced/`

**For variance scenarios**: See `data/scenarios/02-material-variance/`

**For timing issues**: See `data/scenarios/03-timing-differences/`

**For multi-period**: See `data/scenarios/04-roll-forward-multi-period/`

**For critical issues**: See `data/scenarios/05-missing-subledger-data/`

## Quality checklist

Before finalizing a scenario, verify:

- [ ] README shows all calculations with math
- [ ] CSV files use correct sign conventions
- [ ] Period field included in all CSVs
- [ ] Amounts formatted correctly (no commas, 2 decimals)
- [ ] Transaction file (if included) tells complete story
- [ ] Expected results JSON matches README
- [ ] Test assertions included
- [ ] Agent behavior documented for all 4 agents
- [ ] Resolution steps included (for error scenarios)
- [ ] Files follow naming conventions
- [ ] Scenario number is unique (not used by existing scenario)

## Example interaction

**User**: "Create a scenario where the subledger has a $50,000 invoice that's not in GL"

**Your response**:
1. Clarify: Which account? Which period? Should this be material?
2. Design: GL has balance of -$1,000,000, subledger shows -$1,050,000
3. Calculate: Variance = -$50,000 (subledger > GL)
4. Create: `data/scenarios/06-missing-gl-entry/`
5. Generate all 5 files following standards
6. Document: Agents should detect missing GL entry, suggest journal entry

## Tips for realistic scenarios

1. **Use real-world patterns**: Base scenarios on actual accounting errors you've seen
2. **Vary the vendors**: Use different vendor names across scenarios
3. **Realistic amounts**: Use irregular amounts like $385,247.50, not round numbers
4. **Include context**: Explain why the error happened (user training, system bug, etc.)
5. **Mix account types**: Don't just use Account 20100 every time
6. **Date appropriately**: Use realistic invoice dates, due dates, payment dates
7. **Add narratives**: Transaction descriptions should be specific (not just "invoice")

## References

- **Standards**: `data/scenarios/README.md`
- **Documentation guide**: `DOCUMENTATION_STANDARDS.md`
- **Testing guide**: `data/scenarios/TESTING_GUIDE.md`
- **Scenario summary**: `data/scenarios/SCENARIO_SUMMARY.md`
- **Existing scenarios**: `data/scenarios/01-05/`

## Notes

- Always verify calculations manually before creating files
- Test the scenario after creating it
- If variance is complex, include extra explanation in README
- For critical/urgent scenarios, emphasize severity in expected agent behavior
- Keep scenarios focused - one error per scenario is usually best
- Number scenarios sequentially starting from 06 (01-05 already exist)
