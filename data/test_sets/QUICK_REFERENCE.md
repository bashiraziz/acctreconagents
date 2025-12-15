# Quick Test Reference

## ✅ BALANCED TEST SET
**Path**: `data/test_sets/balanced/`

| File | Rows | Total |
|------|------|-------|
| gl_balance.csv | 2 accounts | $1,400,000 |
| subledger_balance.csv | 5 invoices | $1,400,000 |

**Result**: Perfect match - No variances ✓

---

## ⚠️ UNBALANCED TEST SET
**Path**: `data/test_sets/unbalanced/`

| File | Rows | Total |
|------|------|-------|
| gl_balance.csv | 2 accounts | $1,355,000 |
| subledger_balance.csv | 7 invoices | $1,675,000 |

**Variance**: $320,000 (Subledger overstated)

### Issues to Find:
1. **Radius Labs INV-99302** - Duplicated ($275k)
2. **Orion Research Accrual** - Missing from GL ($45k)

**After Corrections**: Both balance at $1,400,000 ✓

---

## Testing in the Application

1. **Navigate to**: http://localhost:3000

2. **Upload Files**:
   - Click "Upload CSV" under "Structured Data"
   - Select file type: "GL Balance" or "Subledger Balance"
   - Upload corresponding CSV files

3. **Map Columns**:
   - Click "Auto-Suggest" button
   - Review and confirm mappings
   - Click "Apply Mappings"

4. **Preview Data**:
   - Check the data preview panel
   - Verify row counts and totals

5. **Run Reconciliation**:
   - Enter prompt: "Reconcile GL to Subledger for October 2025"
   - Click "Run Agents"
   - Watch the 4-agent pipeline execute

6. **Review Results**:
   - 🔵 Validation: Data quality check
   - 🟣 Analysis: Variance identification
   - 🟠 Investigation: Root cause analysis
   - 🟢 Report: Detailed findings and recommendations
