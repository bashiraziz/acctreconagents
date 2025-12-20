# Database Setup Guide - Neon

Complete guide to setting up Neon serverless Postgres for Better Auth.

## Step 1: Create Neon Account

1. **Go to Neon:** https://neon.tech
2. **Sign up** with GitHub, Google, or email
3. **Free tier includes:**
   - 0.5 GB storage
   - Unlimited databases
   - Serverless compute
   - Branching (dev/staging environments)

## Step 2: Create Project

1. **Click "Create a project"**
2. **Project settings:**
   - Name: `acctreconagents` (or your preferred name)
   - Region: Choose closest to you (US East, EU, Asia)
   - Postgres version: 16 (latest)
3. **Click "Create project"**

## Step 3: Get Connection String

After project creation, you'll see the connection string:

```
postgres://[user]:[password]@[host]/[database]?sslmode=require
```

Example:
```
postgres://neondb_owner:npg_xxxxxxxxxxxx@ep-cool-name-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Copy this entire connection string!**

## Step 4: Update .env.local

Add the connection string to your `.env.local` file:

```bash
# Database Configuration
POSTGRES_URL="postgres://neondb_owner:npg_xxxxxxxxxxxx@ep-cool-name-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Important:** Keep the quotes around the connection string!

Your complete `.env.local` should now include:

```bash
# Existing settings
OPENAI_API_KEY=your-key
GEMINI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key

# Better Auth Configuration
BETTER_AUTH_SECRET=ZtrAv1axNFyvQmkZzqoAMK4pxNrt9RWHPCy4Ds97BuE=
BETTER_AUTH_URL=http://localhost:3000

# Database Configuration (NEW!)
POSTGRES_URL="postgres://neondb_owner:npg_your-password@ep-your-instance.region.aws.neon.tech/neondb?sslmode=require"

# Orchestrator Service URL
ORCHESTRATOR_URL=http://127.0.0.1:3001
```

## Step 5: Install Database Dependencies

```bash
cd apps/web
npm install pg dotenv
```

## Step 6: Run Database Migration

```bash
cd apps/web
npx tsx scripts/migrate-neon.ts
```

**Expected output:**
```
🗄️  Migrating database for Better Auth...

✓ Connected to Neon database

Creating Better Auth tables...
✓ user table created
✓ session table created
✓ account table created
✓ verification table created
✓ Indexes created

Creating application tables...
✓ user_mappings table created
✓ user_accounts table created
✓ reconciliation_history table created
✓ App indexes created

✅ Database migration complete!
```

## Step 7: Verify Database Setup

### Option 1: Using Neon Console

1. Go to your Neon dashboard
2. Click on your project
3. Go to **SQL Editor** tab
4. Run this query:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see 7 tables:
- user
- session
- account
- verification
- user_mappings
- user_accounts
- reconciliation_history

### Option 2: Using CLI

```bash
npx tsx scripts/test-db-connection.ts
```

## Step 8: Restart Dev Server

```bash
cd apps/web
npm run dev
```

**Check the console** - you should no longer see auth errors!

## Step 9: Test Authentication

1. Open http://localhost:3000
2. Click **"Sign In"** button in the auth banner
3. Click **"Don't have an account? Sign up"**
4. Fill in:
   - Name: Your name
   - Email: your@email.com
   - Password: (min 6 characters)
5. Click **"Create Account"**
6. You should be logged in! ✅

**Verify:**
- Auth banner disappears
- User menu appears in top right
- Shows your name and email
- No rate limit warnings (unlimited for authenticated users)

---

## Troubleshooting

### "POSTGRES_URL not found in .env.local"

**Fix:**
- Make sure you added the connection string to `.env.local`
- Restart the dev server after updating `.env.local`
- Check that quotes are around the connection string

### "Connection refused" or timeout

**Fix:**
- Check your internet connection
- Verify the connection string is correct
- Ensure `?sslmode=require` is at the end

### "Password authentication failed"

**Fix:**
- Go to Neon dashboard → your project → Connection Details
- Click "Reset password" to get a new connection string
- Update `.env.local` with the new string

### Tables already exist

**Fix:**
This is fine! The migration script uses `CREATE TABLE IF NOT EXISTS`, so it won't error if tables exist.

### Still seeing auth errors after migration

**Fix:**
1. Restart the dev server: `Ctrl+C` then `npm run dev`
2. Hard refresh browser: `Ctrl+Shift+R` or `Cmd+Shift+R`
3. Clear browser cache and localStorage
4. Check console for specific errors

---

## Database Management

### View Tables in Neon Console

1. Go to https://console.neon.tech
2. Select your project
3. Click **SQL Editor**
4. Run queries to view data:

```sql
-- View all users
SELECT id, email, name, created_at FROM "user";

-- View active sessions
SELECT s.id, s.user_id, u.email, s.created_at
FROM "session" s
JOIN "user" u ON s.user_id = u.id;

-- View user mappings
SELECT user_id, file_type, created_at
FROM user_mappings;
```

### Backup Database

Neon automatically backs up your data daily. No action needed!

### Create Branch (Dev Environment)

1. Go to Neon console
2. Click **Branches** tab
3. Click **Create branch**
4. Name: `development`
5. You get a separate connection string for testing!

---

## Cost & Limits

**Neon Free Tier:**
- Storage: 0.5 GB
- Compute: Always available
- Branches: Unlimited
- Backups: Daily (7 days retention)
- **Perfect for development and small production apps!**

**If you outgrow free tier:**
- Scale plan: $19/month (3 GB storage)
- Business plan: $69/month (unlimited)

---

## Security Best Practices

1. **Never commit .env.local** (already in .gitignore)
2. **Rotate passwords** periodically in Neon console
3. **Use environment variables** in production (Vercel, Railway, etc.)
4. **Enable IP allowlist** in Neon (optional, for extra security)
5. **Monitor query logs** in Neon console

---

## Next Steps

After database is set up:

✅ Authentication works
✅ Users can sign up/sign in
✅ Column mappings persist across sessions
✅ No rate limits for logged-in users
✅ Reconciliation history saved

**Production deployment:**
1. Get production Neon connection string
2. Add to Vercel/Railway environment variables
3. Run migration in production
4. Deploy!

---

## Support

- **Neon Docs:** https://neon.tech/docs
- **Better Auth Docs:** https://www.better-auth.com/docs
- **Neon Discord:** https://discord.gg/neon
- **GitHub Issues:** https://github.com/bashiraziz/acctreconagents/issues
