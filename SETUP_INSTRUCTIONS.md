# 🚀 Complete Setup Instructions

Follow these steps **in order** to get your refactored app running.

---

## 📦 Step 1: Install Dependencies

```bash
# Navigate to web app
cd apps/web

# Install all dependencies
npm install zustand papaparse better-auth @vercel/postgres
npm install --save-dev @types/papaparse

# Go back to root
cd ../..
```

---

## 🗄️ Step 2: Setup Database

### Option A: Vercel Postgres (Recommended)

1. **Create database on Vercel:**
   - Go to https://vercel.com/dashboard
   - Select your project (or create new)
   - Click "Storage" tab → "Create Database" → "Postgres"
   - Name: `acctreconagents-db`

2. **Get connection strings:**
   - After creation, click "Connect"
   - Copy all the environment variables shown

### Option B: Neon (Alternative)

1. Go to https://neon.tech
2. Create new project: `acctreconagents`
3. Copy connection string

---

## 🔐 Step 3: Configure Environment Variables

Create **`apps/web/.env.local`** (not .env - this is Next.js specific):

```env
# ============================================
# DATABASE (Vercel Postgres or Neon)
# ============================================
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# ============================================
# BETTER AUTH
# ============================================
# Generate secret: openssl rand -base64 32
BETTER_AUTH_SECRET="your-random-secret-here"
BETTER_AUTH_URL="http://localhost:3000"

# ============================================
# GEMINI API (Free tier)
# ============================================
# Get free key: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="your-gemini-key-here"

# ============================================
# ORCHESTRATOR SERVICE
# ============================================
ORCHESTRATOR_URL="http://127.0.0.1:4100"
```

Also update **`services/orchestrator/.env`**:

```env
# ============================================
# GEMINI API (Same key as web app)
# ============================================
GEMINI_API_KEY="your-gemini-key-here"

# ============================================
# ORCHESTRATOR CONFIG
# ============================================
PORT=4100
ORCHESTRATOR_LLM_MODE=gemini
MATERIALITY_THRESHOLD=50

# ============================================
# OPTIONAL: OpenAI/Claude (if you want premium features later)
# ============================================
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
```

---

## 🗃️ Step 4: Initialize Database

```bash
cd apps/web

# Run database initialization script
npx tsx scripts/init-db.ts

cd ../..
```

You should see:
```
✓ Database tables created successfully!
✓ user_mappings table created
✓ user_accounts table created
✓ reconciliation_history table created
```

---

## 🏃 Step 5: Start Development Servers

Open **TWO terminal windows**:

### Terminal 1 - Orchestrator Service
```bash
cd services/orchestrator
npm run dev
```

Wait for:
```
Server listening at http://0.0.0.0:4100
```

### Terminal 2 - Web App
```bash
cd apps/web
npm run dev
```

Wait for:
```
Ready on http://localhost:3000
```

---

## ✅ Step 6: Test the Application

1. **Open browser:** http://localhost:3000

2. **Test Anonymous Mode:**
   - Upload a CSV file (or use sample data)
   - Map columns
   - See "Sign in to save your work" banner
   - Run reconciliation
   - Refresh page → data is lost (expected)

3. **Test Authenticated Mode:**
   - Click "Sign In" button
   - Register new account (email + password)
   - Upload CSV file
   - Map columns
   - Run reconciliation
   - Refresh page → mappings are saved!

4. **Test Gemini Agents:**
   - Check the timeline shows 4 agent stages:
     - Data Validation Agent
     - Reconciliation Analyst Agent
     - Investigator Agent (if variances found)
     - Report Generator Agent

---

## 🎯 What You Should See

### New UI Features:
- ✅ Workflow progress indicator (4 steps)
- ✅ File type selector (GL Balance, Subledger, Transactions)
- ✅ Data preview table
- ✅ Auto-column mapping suggestions
- ✅ "Sign in to save" banner for anonymous users
- ✅ User menu for authenticated users
- ✅ Stop button while agents are running
- ✅ Better error messages

### New Agent Output:
- ✅ Data validation report
- ✅ Variance analysis with risk levels
- ✅ Root cause investigations
- ✅ Audit-ready documentation

---

## 🐛 Troubleshooting

### "Can't connect to orchestrator"
```bash
# Make sure orchestrator is running on port 4100
cd services/orchestrator
npm run dev
```

### "Database connection failed"
- Check your .env.local has correct POSTGRES_URL
- Run init-db.ts script again
- Check Vercel dashboard that database is active

### "Gemini API error"
- Get free API key: https://aistudio.google.com/app/apikey
- Add to both apps/web/.env.local and services/orchestrator/.env
- Check you haven't exceeded free tier (1500 requests/day)

### "Better Auth not working"
- Make sure BETTER_AUTH_SECRET is set
- Try generating new secret: `openssl rand -base64 32`
- Check BETTER_AUTH_URL matches your dev server

---

## 📂 New Files Created

```
apps/web/
├── src/
│   ├── types/
│   │   └── reconciliation.ts          # Shared TypeScript types
│   ├── lib/
│   │   ├── auth.ts                    # Better Auth config
│   │   ├── db/
│   │   │   ├── client.ts              # Database client
│   │   │   └── queries.ts             # Database queries
│   │   ├── parseFile.ts               # CSV parsing with PapaParse
│   │   └── transformData.ts           # Data transformation + Zod validation
│   ├── store/
│   │   └── reconciliationStore.ts     # Zustand state management
│   ├── components/
│   │   ├── auth/
│   │   │   ├── auth-banner.tsx        # "Sign in to save" banner
│   │   │   └── user-menu.tsx          # User profile menu
│   │   ├── workflow-progress.tsx      # Progress indicator
│   │   └── data-preview.tsx           # Data preview table
│   └── app/
│       └── api/
│           ├── auth/[...all]/route.ts # Better Auth routes
│           └── user/
│               └── mappings/route.ts  # Save/load mappings
├── scripts/
│   └── init-db.ts                     # Database initialization
└── .env.local                         # Environment variables

services/orchestrator/
├── src/
│   ├── agents/
│   │   └── gemini-agents.ts           # 4 Gemini agents
│   └── index.ts                       # Updated orchestrator
└── .env                               # Orchestrator environment
```

---

## 🎉 Next Steps

Once everything is working:

1. **Deploy to Vercel:**
   - Push to GitHub
   - Import to Vercel
   - Add environment variables
   - Deploy!

2. **Add more features:**
   - Export reconciliation reports to PDF
   - Email notifications
   - Multi-user workspaces
   - Advanced variance detection

3. **Optimize:**
   - Add caching for column mappings
   - Batch process multiple accounts
   - Add real-time collaboration

---

**Ready to start? Run the commands in order! 🚀**
