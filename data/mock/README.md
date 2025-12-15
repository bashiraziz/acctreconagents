# Mock Accounting Dataset

This directory contains deterministic CSVs that mirror the canonical Spec-Kit schema so you can demo uploads, header mapping, and reconciliation outcomes. Each subfolder represents a functional area and includes:

- `*_balanced.csv`: ledgers that tie to the GL balances (no variance).
- `*_variance.csv`: subtle mismatches (missing accruals, duplicate postings, timing differences) so the orchestrator can surface reconciliation issues.
- README notes that explain the scenario, period, and expected findings.

## Structure

```
data/mock/
  ap/              # Payables trial balance + aging
  ar/              # Receivables trial balance + aging
  revenue/         # Revenue recognition activity
  unbilled/        # Unbilled / WIP detail
  fixed_assets/    # Fixed asset register + depreciation rollforward
  gl/              # Canonical GL balances + transaction detail
```

All files use commas, UTC periods (e.g., `2025-10`), and USD currency unless otherwise noted. Use them as-is in the UI uploader or wire them into orchestrator contract tests.
