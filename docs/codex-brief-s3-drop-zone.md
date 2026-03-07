# Codex Brief: S3 Drop Zone — Automated CSV Ingestion

## Overview

Enable companies that cannot use direct API integrations to drop CSV files into a
platform-owned S3 bucket. A trigger layer detects new uploads, runs the same
import logic used by the UI, and fires an auto-forecast — no manual login required.

## Target app

`apps/web` (Next.js 16, TypeScript, Vercel Blob / local storage today)

---

## Architecture

```
Tenant uploads CSV
      |
      v
S3: acctrecon-drops/tenants/{tenantId}/inbox/{filename}
      |
      v
S3 Event Notification --> SQS queue (or EventBridge)
      |
      v
Lambda / long-poll worker
      |
      v
POST /api/ingest/s3-drop  (new internal route, server-side only)
      |
      v
Existing upload + parse + column-map + forecast pipeline
      |
      v
Result stored; notification sent to tenant
```

---

## Design decisions

### 1. Per-tenant folder routing

```
s3://acctrecon-drops/
  tenants/
    {tenantId}/
      inbox/       <-- tenant writes here (write-only key)
      processed/   <-- worker moves file after success
      failed/      <-- worker moves file after permanent failure
```

Each tenant gets a scoped IAM credential with `s3:PutObject` on their `inbox/`
prefix only. They cannot read, delete, or access other tenants' prefixes.

### 2. Conflict handling

| Scenario | Behavior |
|---|---|
| Same filename uploaded twice | Overwrite (S3 default). Last write wins. Worker re-processes. |
| Same filename already in `processed/` | Move old to `processed/{filename}.{timestamp}.bak`, process new. |
| Partial upload / 0-byte file | Reject: worker validates size > 0 before processing. |
| Unsupported extension | Reject: move to `failed/`, send error notification. |

Configuration flag `INGEST_CONFLICT_MODE=overwrite|append` (default: `overwrite`).
`append` mode is reserved for future multi-period drops; do not implement in this scope.

### 3. Error notifications

On worker failure, send a structured error notification:
- **Channel 1 (required):** write an error record to the DB table `ingest_errors`
- **Channel 2 (optional, env-gated):** POST to `INGEST_ERROR_WEBHOOK_URL` if set
- **Channel 3 (future):** email — out of scope for this brief

Notification payload:
```json
{
  "tenantId": "...",
  "fileName": "...",
  "s3Key": "...",
  "error": "...",
  "timestamp": "ISO-8601"
}
```

---

## New components to build

### A. Terraform / CDK — S3 bucket + IAM

- Bucket: `acctrecon-drops` (private, versioning on, lifecycle: delete `inbox/` objects
  older than 7 days after move)
- Per-tenant IAM policy template (write-only to `tenants/{tenantId}/inbox/*`)
- S3 → SQS event notification on `s3:ObjectCreated:*` for prefix `tenants/`

### B. Database — `ingest_errors` table

```sql
CREATE TABLE ingest_errors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  s3_key      TEXT NOT NULL,
  error       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON ingest_errors (tenant_id, created_at DESC);
```

Also add `ingest_jobs` table to track in-flight and completed drops:

```sql
CREATE TABLE ingest_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  s3_key      TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('pending','processing','done','failed')),
  result      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### C. Worker — `src/workers/s3-ingest-worker.ts`

Long-poll SQS or Lambda handler. For each message:

1. Parse S3 event: extract `tenantId` and `s3Key` from the object key.
2. Validate: size > 0, extension in `[csv, tsv, txt]`.
3. Download file buffer from S3 (`GetObject`).
4. Construct a synthetic `File` object from the buffer.
5. Call the shared ingest function (see section D).
6. On success: move S3 object from `inbox/` to `processed/`; update `ingest_jobs`.
7. On failure: move to `failed/`; write to `ingest_errors`; fire webhook if configured.

### D. Shared ingest function — `src/lib/ingest-pipeline.ts`

Extract the core logic currently in `POST /api/uploads` + the downstream
forecast trigger into a single reusable async function:

```ts
export async function runIngestPipeline(params: {
  tenantId: string;
  fileName: string;
  buffer: Buffer;
  kind?: string;
  source: 'ui' | 's3-drop';
}): Promise<IngestResult>
```

This function must be the single source of truth called by both:
- `POST /api/uploads` (UI path — refactor to call this)
- The S3 worker (automated path)

### E. New API route — `POST /api/ingest/s3-drop`

Internal route, callable only from the worker (verified by `INGEST_INTERNAL_SECRET`
header — compare with `process.env.INGEST_INTERNAL_SECRET`).

Accepts:
```json
{ "tenantId": "...", "s3Key": "...", "jobId": "..." }
```

Downloads the file from S3, calls `runIngestPipeline`, returns result.

### F. Tenant credential management — `POST /api/admin/tenants/{tenantId}/drop-zone`

Admin-only route. Generates scoped IAM write-only key for the tenant and
returns `accessKeyId`, `secretAccessKey`, `bucketName`, `prefix`. Stores the
key ID (not secret) in the `tenants` table for reference. Key rotation supported
by calling the route again (old key is deactivated).

---

## Environment variables

```bash
# S3 drop zone
AWS_DROP_ZONE_BUCKET=acctrecon-drops
AWS_DROP_ZONE_REGION=us-east-1
AWS_DROP_ZONE_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/...

# Worker security
INGEST_INTERNAL_SECRET=<random-32-char>

# Error notifications
INGEST_ERROR_WEBHOOK_URL=          # optional

# Conflict mode
INGEST_CONFLICT_MODE=overwrite     # overwrite | append
```

---

## Files to create

```
src/
  lib/
    ingest-pipeline.ts        # D: shared ingest function
    s3-drop.ts                # S3 utilities: download, move object
  workers/
    s3-ingest-worker.ts       # C: SQS poll loop / Lambda handler
  app/api/
    ingest/s3-drop/route.ts   # E: internal ingest route
    admin/tenants/[tenantId]/drop-zone/route.ts  # F: credential vending
db/
  migrations/
    YYYYMMDD_add_ingest_tables.sql   # B: ingest_jobs + ingest_errors
infra/
  s3-drop-zone.tf             # A: bucket + IAM + SQS
```

---

## Files to modify

| File | Change |
|---|---|
| `src/app/api/uploads/route.ts` | Refactor: call `runIngestPipeline` instead of inline logic |
| `src/lib/file-storage.ts` | Add `downloadFromS3(key)` and `moveS3Object(from, to)` helpers |
| `.env.example` | Add new env vars listed above |

---

## Out of scope (for this brief)

- SFTP server (S3 drop zone is the recommended default; SFTP layer can be
  added later via AWS Transfer Family pointing at the same bucket)
- `append` conflict mode
- Email notifications
- Tenant self-service UI for drop-zone setup (admin API is sufficient for MVP)

---

## Acceptance criteria

1. A file placed at `tenants/{tenantId}/inbox/gl_balance.csv` triggers the full
   ingest pipeline with no manual action.
2. The same `runIngestPipeline` function is used for both UI uploads and S3 drops
   (verified by shared unit tests).
3. A duplicate filename overwrites the previous result (overwrite mode).
4. A malformed CSV moves to `failed/` and writes a row to `ingest_errors`.
5. The internal route returns 401 if `INGEST_INTERNAL_SECRET` is missing or wrong.
6. Per-tenant write-only IAM keys cannot read or delete objects.
