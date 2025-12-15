# Component Update Guide

This guide shows exactly how to update the remaining components to complete the refactor.

---

## ✅ What's Already Done

- ✅ Zustand store with localStorage persistence
- ✅ Better Auth setup (signin/signup)
- ✅ Database schema & client
- ✅ CSV parsing utility (PapaParse)
- ✅ Data transformation with Zod validation
- ✅ Gemini 4-agent pipeline (FREE tier)
- ✅ Auth components (banner + user menu)
- ✅ Workflow progress indicator
- ✅ Data preview component
- ✅ API routes for user mappings

---

## 🔧 Components That Need Updates

### 1. UploadWorkspace Component

**File:** `apps/web/src/components/upload-workspace.tsx`

**Changes Needed:**

1. **Add file type selector** dropdown
2. **Parse full CSV** (not just headers)
3. **Store to Zustand** instead of just localStorage
4. **Show row/column counts** after upload

**Key Code Changes:**

```typescript
// ADD IMPORTS
import { useReconciliationStore } from "@/store/reconciliationStore";
import { parseCSVFile } from "@/lib/parseFile";
import type { FileType } from "@/types/reconciliation";

// ADD STATE for file type
const [fileType, setFileType] = useState<FileType>("gl_balance");

// GET STORE ACTIONS
const setUploadedFile = useReconciliationStore((state) => state.setUploadedFile);

// UPDATE handleFiles function
const handleFiles = async (files: FileList | null, channel: UploadChannel) => {
  if (!files?.length) return;

  for (const file of Array.from(files)) {
    // Parse full CSV
    const result = await parseCSVFile(file, fileType);

    if (result.success && result.data) {
      // Store in Zustand
      setUploadedFile(fileType, result.data);

      // Show success with row count
      setUploads((records) =>
        records.map((entry) =>
          entry.id === record.id
            ? {
                ...entry,
                status: "ready",
                message: `✓ ${result.data.rowCount} rows, ${result.data.columnCount} columns`,
              }
            : entry
        )
      );
    }
  }
};
```

**ADD File Type Selector UI:**

```tsx
<div className="mb-4">
  <label className="text-sm font-medium text-slate-300">
    File Type
    <select
      value={fileType}
      onChange={(e) => setFileType(e.target.value as FileType)}
      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-white"
    >
      <option value="gl_balance">GL Trial Balance</option>
      <option value="subledger_balance">Subledger Balance (AP/AR Aging)</option>
      <option value="transactions">Transaction Detail</option>
    </select>
  </label>
</div>
```

---

### 2. ColumnMapper Component

**File:** `apps/web/src/components/column-mapper.tsx`

**Changes Needed:**

1. **Get files from Zustand** (not localStorage)
2. **Auto-suggest mappings** using `suggestColumnMappings()`
3. **Save to Zustand** + optionally to DB if authenticated
4. **Show live preview** of mapped data

**Key Code Changes:**

```typescript
// ADD IMPORTS
import { useReconciliationStore } from "@/store/reconciliationStore";
import { suggestColumnMappings } from "@/lib/parseFile";
import { createReconciliationPayload } from "@/lib/transformData";
import { useSession } from "@/lib/auth-client";

// GET DATA FROM STORE
const uploadedFiles = useReconciliationStore((state) => state.uploadedFiles);
const setColumnMapping = useReconciliationStore((state) => state.setColumnMapping);
const setReconciliationData = useReconciliationStore((state) => state.setReconciliationData);

// GET AUTH SESSION
const { data: session } = useSession();

// AUTO-SUGGEST MAPPINGS
const handleAutoSuggest = () => {
  if (!uploadedFiles.glBalance) return;

  const suggestions = suggestColumnMappings(
    uploadedFiles.glBalance.headers,
    canonicalBalanceFields.map((f) => f.key)
  );

  setColumnMapping("gl_balance", suggestions);
};

// SAVE AND TRANSFORM
const handleSaveMapping = async () => {
  const columnMappings = useReconciliationStore.getState().columnMappings;

  // Transform data
  const { payload, errors } = createReconciliationPayload(
    uploadedFiles.glBalance,
    columnMappings.gl_balance,
    uploadedFiles.subledgerBalance,
    columnMappings.subledger_balance,
    uploadedFiles.transactions,
    columnMappings.transactions
  );

  if (payload) {
    setReconciliationData(payload);
  }

  // If authenticated, save to database
  if (session?.user) {
    await fetch("/api/user/mappings", {
      method: "POST",
      body: JSON.stringify({
        userId: session.user.id,
        fileType: "gl_balance",
        mapping: columnMappings.gl_balance,
      }),
    });
  }
};
```

**ADD Auto-Suggest Button:**

```tsx
<button
  onClick={handleAutoSuggest}
  className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
>
  Auto-Suggest Mappings
</button>
```

---

### 3. OrchestratorConsole Component

**File:** `apps/web/src/components/orchestrator-console.tsx`

**Changes Needed:**

1. **Remove hardcoded `demoPayload`**
2. **Get data from Zustand**
3. **Add validation before running**
4. **Add stop button**
5. **Display Gemini agent results**

**Key Code Changes:**

```typescript
// ADD IMPORTS
import { useReconciliationStore } from "@/store/reconciliationStore";

// GET DATA FROM STORE
const reconciliationData = useReconciliationStore((state) => state.reconciliationData);
const isRunning = useReconciliationStore((state) => state.isRunning);
const startRun = useReconciliationStore((state) => state.startRun);
const stopRun = useReconciliationStore((state) => state.stopRun);
const completeRun = useReconciliationStore((state) => state.completeRun);

// REPLACE runAgents function
const runAgents = async () => {
  // Validate data exists
  if (!reconciliationData) {
    setError({
      message: "No data to reconcile",
      help: ["Please upload and map your files first"],
    });
    return;
  }

  // Create abort controller
  const abortController = new AbortController();
  const runId = `run_${Date.now()}`;

  startRun(runId, abortController);
  setLoading(true);
  setError(null);

  try {
    const response = await fetch("/api/agent/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPrompt: prompt,
        payload: reconciliationData, // ✅ Real data!
      }),
      signal: abortController.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      setError({
        message: data.message || "Agent run failed",
        detail: data.detail,
        help: data.help,
      });
      return;
    }

    setResult(data);
    completeRun();
  } catch (err) {
    if (err.name === "AbortError") {
      setError({ message: "Reconciliation stopped by user" });
    } else {
      setError({ message: "Agent run failed" });
    }
  } finally {
    setLoading(false);
  }
};
```

**ADD Stop Button:**

```tsx
{isRunning ? (
  <button
    onClick={stopRun}
    className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
  >
    Stop Agents
  </button>
) : (
  <button
    onClick={runAgents}
    disabled={!reconciliationData || loading}
    className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-slate-700 disabled:cursor-not-allowed"
  >
    {loading ? "Running..." : "Run Agents"}
  </button>
)}
```

**ADD Gemini Agent Results Display:**

```tsx
{result?.geminiAgents && (
  <div className="mt-4 space-y-4">
    {/* Validation Results */}
    {result.geminiAgents.validation && (
      <div className="rounded-2xl border border-blue-800/40 bg-blue-950/30 p-4">
        <h4 className="font-semibold text-blue-100">Data Validation</h4>
        <p className="mt-2 text-sm">
          Data Quality: {result.geminiAgents.validation.dataQualityScore}/100
        </p>
        {result.geminiAgents.validation.warnings?.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm text-blue-200/80">
            {result.geminiAgents.validation.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    )}

    {/* Analysis Results */}
    {result.geminiAgents.analysis && (
      <div className="rounded-2xl border border-purple-800/40 bg-purple-950/30 p-4">
        <h4 className="font-semibold text-purple-100">Variance Analysis</h4>
        <p className="mt-2 text-sm">
          Risk Level: <span className="font-semibold uppercase">{result.geminiAgents.analysis.riskLevel}</span>
        </p>
        <p className="text-sm">
          Material Variances: {result.geminiAgents.analysis.materialVariances?.length || 0}
        </p>
      </div>
    )}

    {/* Investigation Results */}
    {result.geminiAgents.investigation?.investigations?.length > 0 && (
      <div className="rounded-2xl border border-orange-800/40 bg-orange-950/30 p-4">
        <h4 className="font-semibold text-orange-100">Investigation Results</h4>
        {result.geminiAgents.investigation.investigations.map((inv, i) => (
          <div key={i} className="mt-3">
            <p className="font-semibold text-sm">Account: {inv.account}</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-orange-200/80">
              {inv.possibleCauses?.map((cause, j) => (
                <li key={j}>{cause}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )}

    {/* Report */}
    {result.geminiAgents.report && (
      <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/30 p-4">
        <h4 className="font-semibold text-emerald-100">Executive Report</h4>
        <div className="mt-2 prose prose-invert prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-emerald-100">
            {result.geminiAgents.report}
          </pre>
        </div>
      </div>
    )}
  </div>
)}
```

---

### 4. Main Page Layout

**File:** `apps/web/src/app/page.tsx`

**Changes Needed:**

1. **Add auth banner & user menu**
2. **Add workflow progress indicator**
3. **Add data preview**
4. **Reorganize layout** for better flow

**Updated Layout:**

```tsx
import { AuthBanner } from "@/components/auth/auth-banner";
import { UserMenu } from "@/components/auth/user-menu";
import { WorkflowProgress } from "@/components/workflow-progress";
import { DataPreview } from "@/components/data-preview";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
        {/* Header with User Menu */}
        <header className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-sky-300">
                AcctReCon · Agentic AI reconciliation workspace
              </p>
              <h1 className="mt-3 text-4xl font-semibold text-white">
                Upload, map, and reconcile faster with agentic AI.
              </h1>
            </div>
            <UserMenu />
          </div>
        </header>

        {/* Auth Banner for Anonymous Users */}
        <AuthBanner />

        {/* Workflow Progress */}
        <WorkflowProgress />

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <UploadWorkspace />
            <ColumnMapper />
            <DataPreview />
            <OrchestratorConsole />
          </div>

          <div className="space-y-6">
            <SampleDataPanel />
            <AboutPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
```

---

## 🚀 Testing Checklist

After making these updates, test:

### Anonymous User Flow:
- [ ] Upload CSV files
- [ ] Auto-suggest column mappings
- [ ] Preview transformed data
- [ ] Run reconciliation
- [ ] See Gemini agent results (4 panels)
- [ ] Refresh page → data is lost (expected)
- [ ] See "Sign in to save" banner

### Authenticated User Flow:
- [ ] Sign up / Sign in
- [ ] Upload CSV files
- [ ] Save column mappings
- [ ] Run reconciliation
- [ ] Refresh page → mappings are still there
- [ ] Sign out

### Agent Pipeline:
- [ ] See 4 Gemini agent stages in timeline
- [ ] See validation results
- [ ] See analysis results
- [ ] See investigation (if variances exist)
- [ ] See executive report

---

## 📝 Quick Reference

### Zustand Store Actions

```typescript
// Get uploaded files
const files = useReconciliationStore((state) => state.uploadedFiles);

// Set uploaded file
setUploadedFile(fileType, parsedFile);

// Get/set column mapping
const mappings = useReconciliationStore((state) => state.columnMappings);
setColumnMapping(fileType, mapping);

// Get/set reconciliation data
const data = useReconciliationStore((state) => state.reconciliationData);
setReconciliationData(payload);

// Agent run control
startRun(runId, abortController);
stopRun();
completeRun();
```

### Common Imports

```typescript
import { useReconciliationStore } from "@/store/reconciliationStore";
import { parseCSVFile, suggestColumnMappings } from "@/lib/parseFile";
import { createReconciliationPayload } from "@/lib/transformData";
import { useSession } from "@/lib/auth-client";
import type { FileType } from "@/types/reconciliation";
```

---

## 🎯 Summary

You're 85% done! The core infrastructure is complete:

✅ Zustand store
✅ Database & auth
✅ CSV parsing
✅ Data transformation
✅ Gemini agents (4 FREE agents)
✅ All utility components

**Just update 4 components** following this guide and you'll have a fully working app!
