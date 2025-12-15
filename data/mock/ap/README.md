# Accounts Payable Mock Data

Period: October 2025 close.

| File | Purpose |
| --- | --- |
| `ap_trial_balance_balanced.csv` | Canonical balance rows that tie to GL 20100/22010. |
| `ap_trial_balance_variance.csv` | Missing Orion Research accrual keeps AP short by $45k. |
| `ap_aging_balanced.csv` | Detailed aging that agrees to the balanced trial balance. |
| `ap_aging_variance.csv` | Includes a duplicate Radius Labs invoice and the missing Orion accrual entry, illustrating the $45k variance.

Use the balanced files to confirm the uploader keeps mappings with no exceptions. Use the variance files to validate that the orchestrator flags the $45k understatement.
