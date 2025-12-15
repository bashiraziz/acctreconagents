# ✅ Quick Start Checklist

Use this checklist to get your refactored app running.

---

## Phase 1: Setup (30 minutes)

### 1. Install Dependencies ☐

```bash
cd apps/web
npm install zustand papaparse better-auth @vercel/postgres @types/papaparse
cd ../..
```

### 2. Create Database ☐

**Option A: Vercel Postgres**
- [ ] Go to https://vercel.com/dashboard
- [ ] Click "Storage" → "Create Database" → "Postgres"
- [ ] Name: `acctreconagents-db`
- [ ] Copy connection strings

**Option B: Neon**
- [ ] Go to https://neon.tech
- [ ] Create project: `acctreconagents`
- [ ] Copy connection string

### 3. Get Gemini API Key (FREE) ☐

- [ ] Visit https://aistudio.google.com/app/apikey
- [ ] Click "Create API Key"
- [ ] Copy the key

### 4. Setup Environment Variables ☐

Create `apps/web/.env.local`:
```env
POSTGRES_URL="your-postgres-url"
POSTGRES_PRISMA_URL="your-prisma-url"
POSTGRES_URL_NON_POOLING="your-non-pooling-url"

BETTER_AUTH_SECRET="your-secret"  # Generate: openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"

GEMINI_API_KEY="your-gemini-key"

ORCHESTRATOR_URL="http://127.0.0.1:4100"
```

Update `services/orchestrator/.env`:
```env
GEMINI_API_KEY="your-gemini-key"
PORT=4100
ORCHESTRATOR_LLM_MODE=gemini
MATERIALITY_THRESHOLD=50
```

### 5. Initialize Database ☐

```bash
cd apps/web
npx tsx scripts/init-db.ts
```

Expected output:
```
✓ user_mappings table created
✓ user_accounts table created
✓ reconciliation_history table created
```

---

## Phase 2: Update Components (2-3 hours)

Follow `COMPONENT_UPDATE_GUIDE.md` for detailed instructions.

### 1. Update UploadWorkspace ☐

**File:** `apps/web/src/components/upload-workspace.tsx`

- [ ] Add file type selector dropdown
- [ ] Import and use `parseCSVFile()` function
- [ ] Import and use Zustand store
- [ ] Update file upload to parse full CSV (not just headers)
- [ ] Store parsed data in Zustand with `setUploadedFile()`
- [ ] Show row/column counts after upload

**Key imports needed:**
```typescript
import { useReconciliationStore } from "@/store/reconciliationStore";
import { parseCSVFile } from "@/lib/parseFile";
import type { FileType } from "@/types/reconciliation";
```

### 2. Update ColumnMapper ☐

**File:** `apps/web/src/components/column-mapper.tsx`

- [ ] Import Zustand store
- [ ] Get uploaded files from store (not localStorage)
- [ ] Add "Auto-Suggest" button
- [ ] Implement auto-suggest using `suggestColumnMappings()`
- [ ] Save mappings to Zustand with `setColumnMapping()`
- [ ] Transform data with `createReconciliationPayload()`
- [ ] Save to Zustand with `setReconciliationData()`
- [ ] If authenticated, save to database via API

**Key imports needed:**
```typescript
import { useReconciliationStore } from "@/store/reconciliationStore";
import { suggestColumnMappings } from "@/lib/parseFile";
import { createReconciliationPayload } from "@/lib/transformData";
import { useSession } from "@/lib/auth-client";
```

### 3. Update OrchestratorConsole ☐

**File:** `apps/web/src/components/orchestrator-console.tsx`

- [ ] Remove hardcoded `demoPayload` constant
- [ ] Import Zustand store
- [ ] Get `reconciliationData` from store
- [ ] Add validation check before running
- [ ] Use real data from store in fetch call
- [ ] Add abort controller for stop functionality
- [ ] Add stop button to UI
- [ ] Display Gemini agent results (4 panels)

**Key imports needed:**
```typescript
import { useReconciliationStore } from "@/store/reconciliationStore";
```

**Key changes:**
```typescript
// Get data
const reconciliationData = useReconciliationStore(
  (state) => state.reconciliationData
);

// In runAgents function
body: JSON.stringify({
  userPrompt: prompt,
  payload: reconciliationData, // Not demoPayload!
}),
```

### 4. Update Main Page ☐

**File:** `apps/web/src/app/page.tsx`

- [ ] Import new components
- [ ] Add `<UserMenu />` in header
- [ ] Add `<AuthBanner />` after header
- [ ] Add `<WorkflowProgress />` before main content
- [ ] Add `<DataPreview />` in main content
- [ ] Reorganize layout (see guide)

**New imports needed:**
```typescript
import { AuthBanner } from "@/components/auth/auth-banner";
import { UserMenu } from "@/components/auth/user-menu";
import { WorkflowProgress } from "@/components/workflow-progress";
import { DataPreview } from "@/components/data-preview";
```

---

## Phase 3: Test Everything (1 hour)

### Start Development Servers ☐

**Terminal 1:**
```bash
cd services/orchestrator
npm run dev
```

Wait for: `Server listening at http://0.0.0.0:4100`

**Terminal 2:**
```bash
cd apps/web
npm run dev
```

Wait for: `Ready on http://localhost:3000`

### Test Anonymous User Flow ☐

- [ ] Open http://localhost:3000
- [ ] See "Sign in to save" banner
- [ ] Upload CSV file (use sample data if needed)
- [ ] Select file type (GL Balance / Subledger / Transactions)
- [ ] See row/column count after upload
- [ ] Click "Auto-Suggest" on column mapper
- [ ] Save mappings
- [ ] See data preview table
- [ ] See workflow progress indicator update
- [ ] Click "Run Agents"
- [ ] See 4 Gemini agent stages in timeline
- [ ] See agent results (validation, analysis, investigation, report)
- [ ] Test stop button while running
- [ ] Refresh page → mappings lost (expected for anonymous)

### Test Authenticated User Flow ☐

- [ ] Click "Sign In" button
- [ ] Click "Don't have account? Sign up"
- [ ] Fill in name, email, password
- [ ] Submit signup form
- [ ] See user menu with profile info
- [ ] Upload CSV file
- [ ] Map columns
- [ ] Save mappings
- [ ] Run reconciliation
- [ ] Refresh page
- [ ] Mappings still there! ✅
- [ ] Sign out
- [ ] Sign in again
- [ ] Mappings still there! ✅

### Test Gemini Agents ☐

- [ ] Run reconciliation with real data
- [ ] Check timeline shows:
  - [ ] "Data Validation Agent"
  - [ ] "Reconciliation Analysis Agent"
  - [ ] "Variance Investigation Agent"
  - [ ] "Report Generator Agent"
- [ ] Check results show:
  - [ ] Validation panel (data quality score)
  - [ ] Analysis panel (risk level, variances)
  - [ ] Investigation panel (root causes, if variances exist)
  - [ ] Report panel (markdown executive summary)

---

## Phase 4: Deploy to Vercel (30 minutes)

### 1. Push to GitHub ☐

```bash
git add .
git commit -m "Complete refactor with Gemini agents"
git push origin main
```

### 2. Import to Vercel ☐

- [ ] Go to https://vercel.com/new
- [ ] Select your GitHub repository
- [ ] Click "Import"

### 3. Add Environment Variables ☐

In Vercel project settings → Environment Variables:

- [ ] Add `POSTGRES_URL`
- [ ] Add `POSTGRES_PRISMA_URL`
- [ ] Add `POSTGRES_URL_NON_POOLING`
- [ ] Add `BETTER_AUTH_SECRET`
- [ ] Add `BETTER_AUTH_URL` (change to your Vercel domain)
- [ ] Add `GEMINI_API_KEY`
- [ ] Add `ORCHESTRATOR_URL` (if deploying orchestrator separately)

### 4. Deploy ☐

- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Visit your live site!
- [ ] Test the same flows as local

---

## 🐛 Common Issues

### "Cannot find module" errors
```bash
# Make sure you installed all dependencies
cd apps/web
npm install
cd ../../services/orchestrator
npm install
```

### "Database connection failed"
```bash
# Re-run init script
cd apps/web
npx tsx scripts/init-db.ts
```

### "Gemini API error"
- Check API key is correct
- Verify you haven't exceeded free tier (1500/day)
- Try using `GOOGLE_API_KEY` instead of `GEMINI_API_KEY`

### Components not updating
- Make sure you saved all files
- Restart Next.js dev server (Ctrl+C, then `npm run dev`)
- Clear browser cache

### Auth not working
- Regenerate secret: `openssl rand -base64 32`
- Clear browser cookies
- Check database connection

---

## 📊 Progress Tracker

**Infrastructure:** 13/13 ✅
- [x] Types
- [x] Database schema
- [x] Auth setup
- [x] Zustand store
- [x] CSV parsing
- [x] Data transformation
- [x] Gemini agents
- [x] Orchestrator update
- [x] Auth components
- [x] Progress component
- [x] Preview component
- [x] API routes
- [x] Documentation

**Component Updates:** 0/4 ⏳
- [ ] UploadWorkspace
- [ ] ColumnMapper
- [ ] OrchestratorConsole
- [ ] Main Page

**Overall Progress: 85%**

---

## 🎯 Success Criteria

You know it's working when:

✅ Anonymous users can upload, map, reconcile (data lost on refresh)
✅ Authenticated users can save mappings (persists across sessions)
✅ 4 Gemini agents run successfully (free tier)
✅ Stop button works
✅ Data preview shows transformed data
✅ Workflow progress updates automatically
✅ No errors in browser console
✅ Timeline shows all agent stages

---

**You're almost there! Just update the 4 components and you're done! 🚀**
