# Revenue Recognition Mock Data

Model contracts with straight-line schedules. Files align with the canonical `transaction_line` schema so you can feed them directly into the orchestrator.

| File | Notes |
| --- | --- |
| `revenue_recognition_balanced.csv` | Monthly revenue entries that agree to GL 40000. |
| `revenue_recognition_variance.csv` | Contract R-204 missed an October entry, creating a $18k shortfall. |
| `revenue_summary.csv` | High-level rollforward that should match the balanced detail.
