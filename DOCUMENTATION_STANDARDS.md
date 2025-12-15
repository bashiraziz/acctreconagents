# Documentation Standards for Accounting Reconciliation System

## Overview
This document outlines the standards and best practices for documenting requirements, test scenarios, and implementation details.

## Directory Structure

```
acctreconagents/
├── specs/                              # Requirements & specifications
│   ├── requirements/
│   │   └── user-stories.md            # ✅ Created - Agile user stories
│   ├── scenarios/                      # BDD test scenarios (future)
│   └── data-dictionary.md             # Field definitions (future)
│
├── data/
│   └── scenarios/                      # ✅ Created - Test data scenarios
│       ├── README.md                   # ✅ Standards and conventions
│       ├── 01-simple-balanced/         # ✅ Perfect reconciliation
│       │   ├── README.md
│       │   ├── gl_balance.csv
│       │   ├── subledger_balance.csv
│       │   ├── transactions.csv
│       │   └── expected_results.json
│       └── 02-material-variance/       # ✅ Duplicate invoice error
│           ├── README.md
│           ├── gl_balance.csv
│           ├── subledger_balance.csv
│           └── expected_results.json
```

## What's Been Created

### 1. Test Scenario Framework ✅
**Location**: `data/scenarios/`

**Contents:**
- **Master README**: Standards for creating test scenarios
- **Scenario 01**: Simple balanced reconciliation (perfect match)
- **Scenario 02**: Material variance due to duplicate invoice

**Each scenario includes:**
- Detailed README with narrative, calculations, expected behavior
- CSV data files (GL, subledger, transactions)
- Expected results JSON for automated testing
- Test assertions
- Resolution steps (for error scenarios)

### 2. Requirements Documentation ✅
**Location**: `specs/requirements/user-stories.md`

**Contents:**
- 8 user stories covering core functionality
- Acceptance criteria for each story
- Business rules and definitions
- Agent responsibilities
- Story sizing estimates
- Technical notes and dependencies

## Documentation Standards by Type

### 1. User Stories (Agile Format)

**Template:**
```markdown
## Story Title

**As a** [role]
**I want** [goal]
**So that** [benefit]

#### Acceptance Criteria
- [ ] Specific testable requirement 1
- [ ] Specific testable requirement 2

#### Business Rules
- Rule 1
- Rule 2
```

**Example**: See `specs/requirements/user-stories.md`

---

### 2. Test Scenarios (BDD-Style)

**Each scenario must have:**

**README.md** with:
- Purpose statement
- Detailed scenario description
- Beginning balances (if applicable)
- Activity/transactions
- Ending balances
- Expected reconciliation results
- Agent expected behavior
- Test assertions (code)
- Resolution steps (for errors)

**Data Files:**
- `gl_balance.csv`
- `subledger_balance.csv`
- `transactions.csv` (optional)
- `expected_results.json`

**Example**: See `data/scenarios/01-simple-balanced/`

---

### 3. BDD Scenarios (Gherkin - Future)

**Template:**
```gherkin
Feature: Account Reconciliation

  Scenario: Balanced AP reconciliation
    Given GL balance for account 20100 is -$1,185,000
    And subledger total for account 20100 is -$1,185,000
    When I run the reconciliation
    Then the variance should be $0
    And the status should be "balanced"
    And no investigation should be required
```

**Location**: `specs/scenarios/` (to be created)

---

### 4. Data Dictionary (Future)

**Template:**
```markdown
## Field: account_code

**Type**: String
**Required**: Yes
**Format**: 5-digit account number (e.g., "20100")
**Description**: General ledger account code
**Examples**:
  - "20100" - Accounts Payable Control
  - "22010" - Accrued Expenses
**Validation**: Must be numeric string, 3-7 characters
**Used In**: GL Balance, Subledger Balance, Transactions
```

**Location**: `specs/data-dictionary.md` (to be created)

---

### 5. API Documentation (Future)

**Template:**
```markdown
## POST /api/agent/runs

Run reconciliation with AI analysis

**Request Body:**
\`\`\`json
{
  "userPrompt": "Reconcile October 2025 AP",
  "payload": {
    "glBalances": [...],
    "subledgerBalances": [...],
    "transactions": [...]
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "runId": "run_1234",
  "timeline": [...],
  "geminiAgents": {...}
}
\`\`\`
```

**Location**: `specs/api-documentation.md` (to be created)

---

## Best Practices

### ✅ DO:

1. **Be Specific**: "Variance > $50 is material" not "Large variances are flagged"
2. **Include Examples**: Show sample data, expected outputs
3. **Show Calculations**: Explain the math in scenarios
4. **Document "Why"**: Explain business reasoning, not just technical implementation
5. **Use Real Names**: "Accounts Payable" not "Account Type A"
6. **Test Assertions**: Include code snippets showing how to verify
7. **Expected Behavior**: Document what AI agents should say/detect
8. **Resolution Steps**: For error scenarios, explain how to fix

### ❌ DON'T:

1. **Vague Requirements**: "System should be fast" (how fast?)
2. **Technical Jargon**: "Aggregate via MapReduce" → "Sum up amounts"
3. **Assumptions**: Document all business rules explicitly
4. **Missing Examples**: Every requirement should have an example
5. **Incomplete Scenarios**: Don't create test data without narrative
6. **Real Data**: Always anonymize company/vendor names

---

## Workflow for New Features

### 1. Requirements Phase
1. Create user story in `specs/requirements/user-stories.md`
2. Define acceptance criteria
3. Document business rules
4. Get stakeholder approval

### 2. Test Design Phase
1. Create scenario in `data/scenarios/XX-scenario-name/`
2. Write README with detailed narrative
3. Create test data files
4. Document expected results JSON
5. Write test assertions

### 3. Implementation Phase
1. Write code to satisfy acceptance criteria
2. Run against test scenarios
3. Validate actual results match expected results
4. Update documentation if behavior changes

### 4. Review Phase
1. Demo using test scenarios
2. Verify AI agent outputs match expectations
3. Update README if edge cases discovered
4. Create new scenarios for bugs found

---

## Scenario Categories

### Balanced Scenarios (01-10)
Perfect reconciliations, no issues
- Tests basic functionality
- Validates data flow
- Confirms agent outputs for "good" data

### Variance Scenarios (11-20)
Errors requiring investigation
- Duplicates
- Missing entries
- Timing differences
- Data entry errors

### Complex Scenarios (21-30)
Multi-period, roll-forwards
- Period-over-period calculations
- Activity analysis
- Adjustment tracking

### Edge Cases (31-40)
Boundary conditions
- Empty files
- Single transaction
- Very large amounts
- Missing fields

---

## Quality Checklist

Before committing new documentation:

**User Stories:**
- [ ] Follows "As a...I want...So that" format
- [ ] Has specific, testable acceptance criteria
- [ ] Documents all business rules
- [ ] Includes examples
- [ ] Sized (S/M/L) with day estimate

**Test Scenarios:**
- [ ] README explains the "why"
- [ ] All calculations shown and verified
- [ ] Data files include all required fields
- [ ] Expected results JSON is complete
- [ ] Test assertions included
- [ ] Resolution steps for error scenarios
- [ ] Files follow naming conventions

**Data Files:**
- [ ] Headers match canonical field names
- [ ] Amounts use correct sign convention
- [ ] Periods in YYYY-MM format
- [ ] No thousands separators
- [ ] Two decimal places
- [ ] No real company data

---

## Tools & Formats

### Documentation Formats
- **Requirements**: Markdown (.md)
- **Test Data**: CSV files
- **Expected Results**: JSON
- **API Specs**: OpenAPI/Swagger (future)
- **Diagrams**: Mermaid in markdown (future)

### Version Control
- All documentation in Git
- Update with code changes
- Use meaningful commit messages
- Link commits to user stories

### Validation
- Automated scenario tests (future)
- Documentation linting (future)
- CSV validation (future)

---

## Quick Reference

**Need to document a new requirement?**
→ Add user story to `specs/requirements/user-stories.md`

**Need to create test data?**
→ Create new folder in `data/scenarios/XX-name/`
→ Copy structure from `01-simple-balanced/`

**Need to explain a field?**
→ Add to `specs/data-dictionary.md` (to be created)

**Need to document API?**
→ Add to `specs/api-documentation.md` (to be created)

**Need BDD scenarios?**
→ Create .feature file in `specs/scenarios/` (to be created)

---

## Examples in This Repo

✅ **User Story**: `specs/requirements/user-stories.md` - Story 1
✅ **Test Scenario**: `data/scenarios/01-simple-balanced/README.md`
✅ **Test Data**: `data/scenarios/01-simple-balanced/*.csv`
✅ **Expected Results**: `data/scenarios/01-simple-balanced/expected_results.json`

---

## Next Steps

### Immediate:
1. Review `specs/requirements/user-stories.md`
2. Review `data/scenarios/README.md`
3. Test scenarios 01 and 02 in the UI
4. Create additional scenarios as needed

### Future:
1. Create `specs/data-dictionary.md`
2. Create `specs/reconciliation-logic.md` (algorithm details)
3. Create `specs/scenarios/` with Gherkin files
4. Set up automated scenario testing
5. Add API documentation
6. Create architecture diagrams

---

## Questions?

See existing examples or reach out to the development team.

**Key Files:**
- This document: `DOCUMENTATION_STANDARDS.md`
- User stories: `specs/requirements/user-stories.md`
- Test scenarios: `data/scenarios/README.md`
- Scenario examples: `data/scenarios/01-simple-balanced/`
