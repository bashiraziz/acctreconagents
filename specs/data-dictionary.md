# Data Dictionary

Comprehensive field definitions for the accounting reconciliation system.

## Table of Contents

1. [GL Balance Fields](#gl-balance-fields)
2. [Subledger Balance Fields](#subledger-balance-fields)
3. [Transaction Fields](#transaction-fields)
4. [Data Type Conventions](#data-type-conventions)
5. [Sign Conventions](#sign-conventions)
6. [Period Format](#period-format)

---

## GL Balance Fields

General Ledger balance snapshot representing the control account totals.

| Field Name | Type | Required | Format | Description | Example |
|------------|------|----------|--------|-------------|---------|
| `account_code` | string | Yes | Alphanumeric | Unique identifier for the GL account. Typically 4-6 digits. | `20100` |
| `account_name` | string | No | Text | Human-readable name of the account | `Accounts Payable Control` |
| `period` | string | Yes | `YYYY-MM` | Accounting period in ISO format (year-month) | `2025-10` |
| `currency` | string | No | ISO 4217 | Three-letter currency code | `USD` |
| `amount` | number | Yes | Decimal(2) | Balance amount. Negative for credit balances (liabilities). | `-1185000.00` |

### Additional Notes
- **account_code**: Must match the subledger's account_code for reconciliation
- **period**: Used to match transactions and subledger records to the correct period
- **amount**: See [Sign Conventions](#sign-conventions) for proper usage

---

## Subledger Balance Fields

Detailed line-item data supporting the GL balance (e.g., AP invoices, AR invoices).

| Field Name | Type | Required | Format | Description | Example |
|------------|------|----------|--------|-------------|---------|
| `vendor` | string | No | Text | Vendor/supplier name (for AP) or customer name (for AR) | `Global Staffing` |
| `invoice_number` | string | Yes | Alphanumeric | Unique invoice/document identifier | `INV-55490` |
| `invoice_date` | date | Yes | `YYYY-MM-DD` | Date the invoice was issued | `2025-10-05` |
| `due_date` | date | No | `YYYY-MM-DD` | Payment due date | `2025-11-04` |
| `aging_bucket` | string | No | Text | Categorization by age: Current, 30 Days, 60 Days, etc. | `Current` |
| `currency` | string | No | ISO 4217 | Three-letter currency code | `USD` |
| `amount` | number | Yes | Decimal(2) | Invoice/line amount. Negative for AP invoices. | `-335000.00` |
| `account_code` | string | Yes | Alphanumeric | GL account this item belongs to | `20100` |
| `period` | string | Yes | `YYYY-MM` | Accounting period this balance belongs to | `2025-10` |

### Additional Notes
- **vendor**: May be called `customer` for AR reconciliations
- **invoice_number**: Must be unique within the subledger
- **aging_bucket**: Common values include:
  - `Current` (0-30 days)
  - `30 Days` (31-60 days)
  - `60 Days` (61-90 days)
  - `90+ Days` (over 90 days)
  - `Accrual` (accrued but not invoiced)
  - `Prior Period` (from previous periods)
- **amount**: See [Sign Conventions](#sign-conventions)
- **period**: Critical for matching to GL balance and transactions

---

## Transaction Fields

Individual journal entries, payments, and invoices that create account activity.

| Field Name | Type | Required | Format | Description | Example |
|------------|------|----------|--------|-------------|---------|
| `account_code` | string | Yes | Alphanumeric | GL account code | `20100` |
| `booked_at` | date | Yes | `YYYY-MM-DD` | Date transaction was posted to GL | `2025-10-05` |
| `debit` | number | No | Decimal(2) | Debit amount (increases assets, decreases liabilities) | `155000` |
| `credit` | number | No | Decimal(2) | Credit amount (decreases assets, increases liabilities) | `335000` |
| `amount` | number | No | Decimal(2) | Net amount (debit - credit). Alternative to debit/credit columns. | `-335000` |
| `narrative` | string | No | Text | Transaction description/memo | `Invoice INV-55490 - Global Staffing contract labor` |
| `source_period` | string | No | `YYYY-MM` | Accounting period transaction belongs to (may differ from booked_at) | `2025-10` |

### Additional Notes
- **debit/credit vs amount**: Transactions may use either:
  - Separate `debit` and `credit` columns (traditional double-entry format)
  - Single `amount` column (negative = credit, positive = debit)
- **booked_at**: Transaction posting date (may be different from invoice_date)
- **narrative**: Should include invoice/check numbers and vendor names for traceability
- **source_period**: Used for accruals and timing difference analysis

---

## Data Type Conventions

### String
- Text data, UTF-8 encoded
- Trimmed of leading/trailing whitespace
- Case-sensitive for codes, case-insensitive for matching vendor names

### Number (Decimal)
- Always stored with 2 decimal places: `1234.56`
- No thousands separators (no commas): Use `1234567.89` not `1,234,567.89`
- Scientific notation not allowed
- Maximum precision: 15 digits before decimal

### Date
- ISO 8601 format: `YYYY-MM-DD`
- Example: `2025-10-31`
- Time zone: All dates are in the reporting entity's local time zone

### Period String
- Format: `YYYY-MM` (year-month)
- Example: `2025-10` represents October 2025
- Used for aggregating and matching records across files

---

## Sign Conventions

**CRITICAL**: Proper sign conventions are essential for accurate reconciliations.

### Assets (Debit Normal Balance)
- **Positive amounts** = Increases (debits)
- **Negative amounts** = Decreases (credits)
- Examples: Cash, Accounts Receivable, Inventory

### Liabilities (Credit Normal Balance)
- **Negative amounts** = Increases (credits) ⚠️ **IMPORTANT**
- **Positive amounts** = Decreases (debits)
- Examples: Accounts Payable, Accrued Expenses, Loans Payable

### Common Transactions

**Accounts Payable (Liability Account):**
| Transaction Type | Amount Sign | Example | Effect |
|-----------------|-------------|---------|--------|
| New invoice | **Negative** | `-335000.00` | Increases liability |
| Payment made | **Positive** | `+150000.00` | Decreases liability |
| Credit memo | **Positive** | `+5000.00` | Decreases liability |
| Ending balance | **Negative** | `-1185000.00` | Credit balance |

**Accounts Receivable (Asset Account):**
| Transaction Type | Amount Sign | Example | Effect |
|-----------------|-------------|---------|--------|
| New invoice | **Positive** | `+50000.00` | Increases asset |
| Payment received | **Negative** | `-30000.00` | Decreases asset |
| Write-off | **Negative** | `-2000.00` | Decreases asset |
| Ending balance | **Positive** | `+125000.00` | Debit balance |

---

## Period Format

### Standard Period Field
- **Format**: `YYYY-MM`
- **Example**: `2025-10` (October 2025)
- **Usage**: Links GL balances, subledger balances, and transactions
- **Sorting**: Lexicographic sort works correctly (`2025-09` < `2025-10` < `2025-11`)

### Period Matching Rules

1. **GL Balance** must have a `period` field
2. **Subledger Balance** must have a `period` field
3. **Transactions** may have either:
   - `booked_at` date (converted to period: `2025-10-15` → `2025-10`)
   - Explicit `source_period` field (preferred)

### Multi-Period Reconciliations

When reconciling across multiple periods (roll-forwards):
- Periods must be consecutive: `["2025-07", "2025-08", "2025-09", "2025-10"]`
- Beginning balance = Ending balance of previous period
- Activity = Sum of transactions in current period
- Ending balance = Beginning balance + Activity

---

## Field Mapping Examples

### Common ERP System Exports

**SAP:**
- `G/L Account` → `account_code`
- `Amount in LC` → `amount`
- `Posting Date` → `booked_at`
- `Document Number` → `invoice_number`

**Oracle:**
- `Account` → `account_code`
- `Entered Amount` → `amount`
- `GL Date` → `booked_at`
- `Invoice Num` → `invoice_number`

**QuickBooks:**
- `Account` → `account_code`
- `Amount` → `amount`
- `Date` → `invoice_date`
- `Num` → `invoice_number`

**Xero:**
- `Account Code` → `account_code`
- `Amount` → `amount`
- `Date` → `invoice_date`
- `Reference` → `invoice_number`

---

## Validation Rules

### GL Balance Validation
- [ ] `account_code` is not empty
- [ ] `period` matches format `YYYY-MM`
- [ ] `amount` is a valid number
- [ ] Each account+period combination appears only once

### Subledger Balance Validation
- [ ] `invoice_number` is not empty
- [ ] `invoice_number` is unique within the file
- [ ] `period` matches format `YYYY-MM`
- [ ] `amount` is a valid number
- [ ] `account_code` exists in GL balance file
- [ ] Sum of subledger by account+period = GL balance (or variance is acceptable)

### Transaction Validation
- [ ] `account_code` is not empty
- [ ] `booked_at` is a valid date
- [ ] Either (`debit` + `credit`) OR `amount` is provided
- [ ] If both formats exist, they must agree: `amount = debit - credit`
- [ ] Transaction sum by account+period should explain balance changes

---

## Reserved Field Names

The following field names have special meaning and should not be used for custom data:

- `id`, `_id` (reserved for internal identifiers)
- `created_at`, `updated_at` (reserved for audit timestamps)
- `user_id`, `session_id` (reserved for authentication)
- `status`, `state` (reserved for workflow status)

---

## Extensibility

Custom fields can be added to any file type:
- Use lowercase with underscores: `custom_field_name`
- Document custom fields in scenario README files
- Custom fields are preserved but not used in reconciliation logic
- Useful for tracking metadata (e.g., `purchase_order_number`, `department_code`)

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-19 | Initial data dictionary release |

---

## Related Documentation

- [Reconciliation Logic](./reconciliation-logic.md) - Algorithm and calculation details
- [Scenario Testing Guide](../data/scenarios/TESTING_GUIDE.md) - How to test with sample data
- [Spec-Kit Schema](./reconciliation.speckit.json) - Machine-readable data model
