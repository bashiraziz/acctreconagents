# Reconciliation Logic

Comprehensive documentation of the reconciliation algorithm and calculation methodology.

## Table of Contents

1. [Overview](#overview)
2. [Core Algorithm](#core-algorithm)
3. [Data Aggregation](#data-aggregation)
4. [Variance Calculation](#variance-calculation)
5. [Status Determination](#status-determination)
6. [Roll-Forward Mechanics](#roll-forward-mechanics)
7. [Transaction Processing](#transaction-processing)
8. [Example Calculations](#example-calculations)

---

## Overview

The reconciliation system compares **General Ledger (GL) balances** against **Subledger balances** to identify and explain variances. The core principle is:

```
Variance = GL Balance - Subledger Balance
```

### Reconciliation Goals

1. **Detect variances** between GL control accounts and supporting detail
2. **Classify variance severity** (balanced, immaterial, material)
3. **Explain variances** using transaction activity
4. **Roll forward balances** across multiple accounting periods
5. **Recommend corrective actions** for material variances

### Key Terminology

- **GL Balance**: Control account total from the general ledger
- **Subledger Balance**: Sum of detailed line items (invoices, receipts, etc.)
- **Variance**: Difference between GL and subledger (GL - Subledger)
- **Materiality Threshold**: Dollar amount defining significance (default: $50 USD)
- **Period**: Accounting time window in `YYYY-MM` format
- **Account Code**: Unique identifier for GL accounts (e.g., `20100`)

---

## Core Algorithm

### High-Level Process

```
1. AGGREGATE GL balances by account + period
2. AGGREGATE Subledger balances by account + period
3. IDENTIFY all unique account+period combinations
4. FOR EACH combination:
   a. Calculate variance = GL - Subledger
   b. Determine status (balanced, immaterial, material)
   c. Attach supporting transactions
   d. Generate explanatory notes
5. RETURN reconciliation results
```

### Implementation (TypeScript)

```typescript
function runReconciliationLocally(payload) {
  // Step 1: Aggregate balances
  const glMap = aggregateBalances(payload.glBalances);        // Map<"account|period", amount>
  const subMap = aggregateBalances(payload.subledgerBalances); // Map<"account|period", amount>

  // Step 2: Process transactions
  const normalizedTransactions = normalizeTransactions(payload.transactions);
  const transactionBuckets = groupTransactionsByAccountPeriod(normalizedTransactions);

  // Step 3: Get all unique account+period combinations
  const resultKeys = union(glMap.keys(), subMap.keys(), transactionBuckets.keys());

  // Step 4: Reconcile each combination
  const reconciliations = resultKeys.map(key => {
    const { account, period } = splitKey(key);
    const gl = glMap.get(key) ?? 0;
    const sub = subMap.get(key) ?? 0;
    const variance = gl - sub;
    const status = determineStatus(variance);

    return {
      account,
      period,
      glBalance: gl,
      subledgerBalance: sub,
      variance,
      status,
      material: Math.abs(variance) >= MATERIALITY_THRESHOLD,
      transactions: transactionBuckets.get(key) ?? [],
    };
  });

  return { reconciliations };
}
```

---

## Data Aggregation

### Balance Aggregation

GL and subledger balances are aggregated by combining `account_code + period`:

```typescript
function aggregateBalances(balances) {
  return balances.reduce((acc, balance) => {
    const key = makeKey(balance.account_code, balance.period ?? "");
    acc.set(key, (acc.get(key) ?? 0) + balance.amount);
    return acc;
  }, new Map());
}

function makeKey(account, period) {
  return `${account}|${period}`;  // e.g., "20100|2025-10"
}
```

### Aggregation Example

**Input GL Balances:**
```csv
account_code,period,amount
20100,2025-10,-1185000.00
22010,2025-10,-215000.00
```

**Aggregated Map:**
```
"20100|2025-10" → -1185000.00
"22010|2025-10" → -215000.00
```

### Handling Multiple Records

If multiple rows have the same `account_code + period`, amounts are **summed**:

**Input:**
```csv
account_code,period,amount
20100,2025-10,-500000.00
20100,2025-10,-685000.00  ← Same account+period
```

**Result:**
```
"20100|2025-10" → -1185000.00  (sum of -500k and -685k)
```

---

## Variance Calculation

### Formula

```
Variance = GL Balance - Subledger Balance
```

### Sign Interpretation

For **liability accounts** (Accounts Payable, Accrued Expenses):

| Variance | Meaning | Example |
|----------|---------|---------|
| **Positive** | GL > Subledger | GL shows MORE liability than detail supports |
| **Negative** | GL < Subledger | Subledger has MORE detail than GL records |
| **Zero** | GL = Subledger | Perfectly balanced ✅ |

### Variance Examples

**Example 1: Balanced**
```
GL:        -$1,185,000
Subledger: -$1,185,000
Variance:  $0           ← Balanced!
```

**Example 2: Missing Subledger Entry (Positive Variance)**
```
GL:        -$1,185,000
Subledger: -$1,085,000  (missing $100k invoice)
Variance:  -$100,000    ← GL has more liability
```
Likely cause: Invoice in GL but not in subledger export

**Example 3: Duplicate Subledger Entry (Negative Variance)**
```
GL:        -$1,185,000
Subledger: -$1,285,000  (duplicate $100k invoice)
Variance:  $100,000     ← Subledger has extra detail
```
Likely cause: Duplicate invoice in subledger

---

## Status Determination

### Status Levels

Reconciliation status is determined by absolute variance:

```typescript
const absVariance = Math.abs(variance);
const status =
  absVariance < 0.01 ? "balanced" :
  absVariance >= materialityThreshold ? "material_variance" :
  "immaterial_variance";
```

### Status Definitions

| Status | Condition | Description | Action Required |
|--------|-----------|-------------|-----------------|
| **balanced** | \|variance\| < $0.01 | Perfect or near-perfect match | ✅ None - monitoring only |
| **immaterial_variance** | $0.01 ≤ \|variance\| < $50 | Minor difference, below threshold | ⚠️ Monitor, document |
| **material_variance** | \|variance\| ≥ $50 | Significant difference requiring investigation | 🚨 Investigate and resolve |

### Materiality Threshold

Default: **$50 USD**

Can be configured via environment variable:
```bash
MATERIALITY_THRESHOLD=100  # Set to $100
```

### Status Examples

**Variance = $0.00**
- Status: `balanced`
- Material: `false`
- Notes: "In balance."

**Variance = $25.50**
- Status: `immaterial_variance`
- Material: `false`
- Notes: "Variance of 25.50 detected. Variance is immaterial but should be monitored."

**Variance = $150,000.00**
- Status: `material_variance`
- Material: `true`
- Notes: "Variance of 150000.00 detected. Variance exceeds materiality threshold ($50.00)."

---

## Roll-Forward Mechanics

### Single Period Reconciliation

For a single period reconciliation:

```
Ending Balance = GL Balance (from file)
```

The system simply compares GL vs Subledger for that period.

### Multi-Period Roll-Forward

For multi-period reconciliations (e.g., quarterly close):

```
Period 1 Ending Balance = Beginning Balance + Activity + Adjustments
Period 2 Beginning Balance = Period 1 Ending Balance
Period 2 Ending Balance = Period 2 Beginning Balance + Activity + Adjustments
... (repeat for all periods)
```

### Roll-Forward Formula

```
Ending Balance = Beginning Balance + Activity + Adjustments

Where:
- Beginning Balance = Prior period's ending balance (or opening balance for first period)
- Activity = Sum of transactions in the period
- Adjustments = Manual journal entries, accruals, reversals
```

### Roll-Forward Example

**Scenario: 3-month AP roll-forward**

| Period | Beginning | Activity | Adjustments | Ending | GL Balance | Variance |
|--------|-----------|----------|-------------|--------|------------|----------|
| 2025-07 | -$750,000 | -$200,000 | $0 | **-$950,000** | -$950,000 | $0 ✅ |
| 2025-08 | -$950,000 | -$150,000 | +$50,000 | **-$1,050,000** | -$1,050,000 | $0 ✅ |
| 2025-09 | -$1,050,000 | -$100,000 | $0 | **-$1,150,000** | -$1,185,000 | -$35,000 🚨 |

**Analysis:**
- Periods 07 and 08: Balanced ✅
- Period 09: Material variance detected (-$35,000)
- Investigation needed: Why does GL show $35k more liability in September?

---

## Transaction Processing

### Transaction Normalization

Transactions can use either:
1. **Debit/Credit columns** (traditional accounting)
2. **Amount column** (single-entry)

```typescript
function normalizeTransactions(transactions) {
  return transactions.map(txn => {
    let net = (txn.debit ?? 0) - (txn.credit ?? 0);

    // If no debit/credit, use amount field
    if (!txn.debit && !txn.credit && txn.amount !== undefined) {
      net = txn.amount;
    }

    // Extract period from booked_at date
    const period = txn.source_period ?? txn.booked_at.substring(0, 7); // "2025-10-15" → "2025-10"

    return {
      account: txn.account_code,
      period,
      net,
      narrative: txn.narrative,
      booked_at: txn.booked_at,
    };
  });
}
```

### Transaction Examples

**Traditional Format (Debit/Credit):**
```csv
account_code,booked_at,debit,credit,narrative
20100,2025-10-05,0,335000,Invoice INV-55490
20100,2025-10-10,155000,0,Payment CHK-8901
```

**Single Amount Format:**
```csv
account_code,booked_at,amount,narrative
20100,2025-10-05,-335000,Invoice INV-55490
20100,2025-10-10,155000,Payment CHK-8901
```

Both produce:
```json
[
  { "account": "20100", "period": "2025-10", "net": -335000 },
  { "account": "20100", "period": "2025-10", "net": 155000 }
]
```

### Activity Calculation

Transaction activity is summed by `account + period`:

```typescript
const activityByAccountPeriod = transactions.reduce((acc, txn) => {
  const key = makeKey(txn.account, txn.period);
  acc.set(key, (acc.get(key) ?? 0) + txn.net);
  return acc;
}, new Map());
```

**Example:**
```
Transactions for "20100|2025-10":
  -335000 (invoice)
  +155000 (payment)
  -420000 (invoice)
  +275000 (payment)
  ─────────
  -325000 (net activity)
```

---

## Example Calculations

### Example 1: Simple Balanced Reconciliation

**Input:**
```
GL Balance (20100, 2025-10):        -$1,185,000
Subledger Balance (20100, 2025-10): -$1,185,000
```

**Calculation:**
```
Variance = -1,185,000 - (-1,185,000) = $0
|Variance| = $0.00
Status = "balanced" (< $0.01)
Material = false
```

**Output:**
```json
{
  "account": "20100",
  "period": "2025-10",
  "glBalance": -1185000,
  "subledgerBalance": -1185000,
  "variance": 0,
  "status": "balanced",
  "material": false,
  "notes": ["In balance."]
}
```

---

### Example 2: Material Variance (Duplicate Invoice)

**Input:**
```
GL Balance (20100, 2025-10):        -$1,185,000
Subledger Balance (20100, 2025-10): -$1,285,000 (includes $100k duplicate)
```

**Calculation:**
```
Variance = -1,185,000 - (-1,285,000) = $100,000
|Variance| = $100,000
Status = "material_variance" ($100k >= $50 threshold)
Material = true
```

**Output:**
```json
{
  "account": "20100",
  "period": "2025-10",
  "glBalance": -1185000,
  "subledgerBalance": -1285000,
  "variance": 100000,
  "status": "material_variance",
  "material": true,
  "notes": [
    "Variance of 100000.00 detected between GL and subledger.",
    "Variance exceeds materiality threshold (50.00)."
  ]
}
```

**Investigation:**
Subledger has $100k more liability than GL. Likely causes:
- Duplicate invoice entry in subledger
- Invoice not posted to GL
- GL reversal not reflected in subledger

---

### Example 3: Multi-Account Reconciliation

**Input:**
```
GL Balances:
  20100 (AP Control):    -$1,185,000
  22010 (Accrued Exp):   -$215,000

Subledger Balances:
  20100 (AP Detail):     -$1,185,000
  22010 (Accrual Detail): -$200,000
```

**Calculations:**

**Account 20100:**
```
Variance = -1,185,000 - (-1,185,000) = $0
Status = "balanced"
```

**Account 22010:**
```
Variance = -215,000 - (-200,000) = -$15,000
|Variance| = $15,000
Status = "immaterial_variance" ($15k < $50 threshold)  ← Wait, this should be material!
```

> **Note:** If materiality threshold is $50, a $15,000 variance is actually MATERIAL. This example assumes a higher threshold (e.g., $20,000) for illustration.

With default $50 threshold:
```
Status = "material_variance" ($15,000 >= $50)
```

**Output:**
```json
[
  {
    "account": "20100",
    "period": "2025-10",
    "variance": 0,
    "status": "balanced"
  },
  {
    "account": "22010",
    "period": "2025-10",
    "variance": -15000,
    "status": "material_variance",
    "material": true
  }
]
```

---

## Algorithm Edge Cases

### Edge Case 1: Missing GL Balance

**Scenario:** Subledger has data, but GL balance is missing

```
GL Balance:        $0 (missing/not provided)
Subledger Balance: -$50,000
Variance:          $50,000
```

**Handling:** Treat missing GL as $0, variance = 0 - (-50,000) = $50,000

### Edge Case 2: Missing Subledger Balance

**Scenario:** GL has balance, but no subledger detail

```
GL Balance:        -$100,000
Subledger Balance: $0 (no detail provided)
Variance:          -$100,000
```

**Critical Issue:** GL has liability with no supporting detail!

### Edge Case 3: No Period Specified

**Scenario:** Balances uploaded without `period` field

```
account_code,amount
20100,-1185000
```

**Handling:**
- Period defaults to empty string `""`
- Key becomes `"20100|"`
- Still reconciles, but roll-forward won't work properly

**Recommendation:** Always include `period` field!

### Edge Case 4: Rounding Differences

**Scenario:** Tiny variance from floating-point arithmetic

```
GL Balance:        -$1185000.00
Subledger Balance: -$1184999.99
Variance:          -$0.01
```

**Handling:** Variance < $0.01 treated as "balanced"

---

## Related Documentation

- [Data Dictionary](./data-dictionary.md) - Field definitions and formats
- [Testing Guide](../data/scenarios/TESTING_GUIDE.md) - How to test reconciliations
- [Scenario Summary](../data/scenarios/SCENARIO_SUMMARY.md) - Example test cases
- [Spec-Kit Schema](./reconciliation.speckit.json) - Machine-readable data model

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-19 | Initial reconciliation logic documentation |
