# Accounts Receivable Mock Data

Period: October 2025 close.

| File | Purpose |
| --- | --- |
| `ar_trial_balance_balanced.csv` | Customer subledger totals that agree to GL 11000. |
| `ar_trial_balance_variance.csv` | Includes an unapplied cash receipt so AR is overstated by $25k. |
| `ar_aging_balanced.csv` | Detail listing that ties to the balanced trial balance. |
| `ar_aging_variance.csv` | Shows the unapplied cash and a credit memo not yet booked, creating the variance scenario.

Run the variance set through the orchestrator to confirm it points to the unapplied cash receipt.
