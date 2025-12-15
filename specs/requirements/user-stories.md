# User Stories

## Epic: Accounts Payable Reconciliation

### Story 1: Basic GL to Subledger Reconciliation

**As a** Financial Controller
**I want to** reconcile GL account balances to detailed subledger records
**So that** I can ensure accuracy and identify discrepancies before month-end close

#### Acceptance Criteria
- [ ] System accepts GL balance file (CSV) with account, period, amount
- [ ] System accepts subledger detail file (CSV) with invoice-level detail
- [ ] System aggregates subledger by account and period
- [ ] System calculates variance: GL Balance - Subledger Balance
- [ ] System displays results showing account, GL, subledger, variance
- [ ] Variance of $0.00 shows status "balanced"
- [ ] Variance > $0.00 shows status "material_variance" or "immaterial_variance"

#### Business Rules
- Materiality threshold: $50 USD
- Accounts Payable (20100) is a liability with credit balances (negative amounts)
- Accrued Expenses (22010) is a liability with credit balances (negative amounts)

---

### Story 2: Material Variance Detection

**As a** Financial Controller
**I want to** automatically flag variances that exceed materiality
**So that** I can focus my investigation on significant issues

#### Acceptance Criteria
- [ ] System compares absolute variance to materiality threshold ($50)
- [ ] Variances >= $50 are flagged as "material"
- [ ] Variances < $50 are flagged as "immaterial"
- [ ] Material variances are highlighted in red
- [ ] Report shows count of material vs immaterial variances

#### Definition of Done
- Unit tests for materiality calculation
- Integration test with $49.99 (immaterial) and $50.00 (material)
- Documentation updated with threshold

---

### Story 3: AI-Powered Variance Investigation

**As a** Financial Controller
**I want** AI agents to analyze variances and suggest root causes
**So that** I can quickly identify and resolve reconciliation issues

#### Acceptance Criteria
- [ ] Validation Agent assesses data quality (0-100% confidence)
- [ ] Analysis Agent detects patterns and calculates risk level (low/medium/high)
- [ ] Investigation Agent identifies possible causes for material variances
- [ ] Report Agent generates audit-ready documentation
- [ ] All agent outputs displayed in web UI

#### Agent Responsibilities

**Validation Agent:**
- Check data completeness and format
- Identify duplicate records
- Flag missing required fields
- Assign confidence score

**Analysis Agent:**
- Calculate reconciliation health score
- Identify variance patterns
- Assess risk level
- List material variances with priority

**Investigation Agent:**
- For each material variance:
  - List possible causes (e.g., "Duplicate invoice", "Missing entry")
  - Suggest corrective actions
  - Assign confidence level to hypothesis
  - Flag if manual review needed

**Report Agent:**
- Generate executive summary
- Detail reconciliation status by account
- Explain material variances with root cause
- Provide recommended actions
- Create audit trail

---

### Story 4: Comprehensive Reconciliation Report

**As a** Financial Controller
**I want to** receive a detailed reconciliation report in markdown format
**So that** I can review results, share with auditors, and document month-end close

#### Acceptance Criteria
- [ ] Report includes executive summary (2-3 sentences)
- [ ] Report shows reconciliation status table with all accounts
- [ ] Material variances section with detailed analysis
- [ ] Root cause analysis for each material variance
- [ ] Recommended actions prioritized by impact
- [ ] Conclusion with overall health assessment
- [ ] Report downloadable as markdown or PDF

---

### Story 5: Multi-Period Roll-Forward

**As a** Financial Controller
**I want to** reconcile account activity across multiple periods
**So that** I can verify opening balance + activity = closing balance

#### Acceptance Criteria
- [ ] System accepts beginning balance for each account
- [ ] System processes transactions by period
- [ ] For each period: Opening + Activity + Adjustments = Closing
- [ ] Roll-forward table shows period-over-period movement
- [ ] Closing balance of period N = Opening balance of period N+1
- [ ] Variance identified if roll-forward doesn't tie to GL

#### Formula
```
Closing Balance = Opening Balance + Debits - Credits + Adjustments
```

---

### Story 6: File Upload and Column Mapping

**As a** Financial Controller
**I want to** upload CSV files and map columns to canonical fields
**So that** I can use my existing export formats without reformatting

#### Acceptance Criteria
- [ ] Drag-and-drop file upload for GL and subledger files
- [ ] System displays preview of first 5 rows
- [ ] User maps each CSV column to canonical field (account_code, amount, etc.)
- [ ] System validates required fields are mapped
- [ ] "Auto-suggest" button uses AI to suggest mappings
- [ ] Mappings persist in browser localStorage
- [ ] User can save/load mapping templates

---

### Story 7: Real-Time Reconciliation Status

**As a** Financial Controller
**I want to** see reconciliation progress in real-time
**So that** I know the system is working and can estimate completion time

#### Acceptance Criteria
- [ ] Timeline shows: Data Upload → Validation → Local Reconciliation → AI Analysis
- [ ] Each stage shows "pending", "in_progress", "completed", or "failed"
- [ ] Progress updates every 500ms
- [ ] User can cancel long-running reconciliation
- [ ] Error messages are user-friendly (not technical stack traces)

---

### Story 8: Test Data Management

**As a** Developer
**I want** comprehensive test scenarios with expected results
**So that** I can validate system behavior and prevent regressions

#### Acceptance Criteria
- [ ] Test scenarios organized by category (balanced, variance, complex)
- [ ] Each scenario includes README with narrative
- [ ] Data files (GL, subledger, transactions) for each scenario
- [ ] Expected results JSON for automated testing
- [ ] Scenarios test: balanced recs, duplicates, missing data, timing differences

---

## Story Sizing (T-Shirt Sizes)

- **Story 1**: Medium (M) - Core functionality, 3-5 days
- **Story 2**: Small (S) - Simple logic, 1-2 days
- **Story 3**: Large (L) - AI integration, 5-8 days
- **Story 4**: Medium (M) - Report generation, 2-3 days
- **Story 5**: Large (L) - Complex logic, 5-7 days
- **Story 6**: Medium (M) - UI + persistence, 3-4 days
- **Story 7**: Small (S) - UI updates, 1-2 days
- **Story 8**: Medium (M) - Test infrastructure, 2-4 days

---

## Dependencies

- Story 1 must be complete before Stories 2-5
- Story 3 depends on Story 2 (needs material variances identified)
- Story 4 depends on Story 3 (needs agent results)
- Story 6 can be done in parallel with Story 1
- Story 7 can be done in parallel with Stories 1-4
- Story 8 should be incremental with each story

---

## Technical Notes

### Data Models
See `/specs/data-dictionary.md` for field definitions

### Reconciliation Algorithm
See `/specs/reconciliation-logic.md` for calculation details

### Agent Prompts
See `/services/orchestrator/src/agents/gemini-agents.ts` for agent implementation

### API Endpoints
- `POST /api/agent/runs` - Submit reconciliation request
- Response includes: timeline, reconciliations, geminiAgents results
