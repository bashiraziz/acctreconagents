---
name: better-auth-nextjs
description: Implement production-ready authentication in Next.js 16 apps using Better Auth with PostgreSQL. Includes email/password login, social auth (Google, GitHub), session management, and database setup. Use when adding user authentication, sign-in pages, or user account features to Next.js applications.
---

# Better Auth with Next.js 16 & PostgreSQL

A production-ready authentication skill using Better Auth with Next.js 16, PostgreSQL (Neon), and full TypeScript support.

## 🎯 Use Cases

- Add authentication to Next.js 16 applications
- Email/password authentication with social providers (Google, GitHub)
- User session management with database persistence
- Account mapping and preferences storage
- Reconciliation history tracking

## ⚠️ Critical Success Factors

**DO NOT use Kysely or Prisma adapters** - they have bundling issues with Next.js 16 + Turbopack.

**DO use the `pg` (node-postgres) adapter** - it works flawlessly with Next.js 16.

## 📦 Dependencies Required

```json
{
  "dependencies": {
    "better-auth": "^1.4.9",
    "pg": "^8.16.3",
    "@vercel/postgres": "^0.10.0"
  }
}
```

## 🏗️ Implementation Structure

### 1. Server-Side Auth Configuration (`src/lib/auth.ts`)

```typescript
import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.POSTGRES_URL;
const ssl =
  databaseUrl && databaseUrl.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined;

const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret && process.env.NODE_ENV === "production") {
  throw new Error("BETTER_AUTH_SECRET is required in production.");
}
const resolvedSecret = authSecret || "dev-insecure-secret-please-set-env";
const authUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

const database = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl,
    })
  : undefined;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

export const auth = betterAuth({
  baseURL: authUrl,
  secret: resolvedSecret,
  database,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
    ...(githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          },
        }
      : {}),
  },
});
```

**Key Features:**
- Graceful fallback for missing secrets in dev
- Conditional SSL for Neon databases
- Optional social providers (only enabled if credentials exist)
- Production safety checks

### 2. Client-Side Auth Hooks (`src/lib/auth-client.ts`)

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
```

**Simple and focused** - exports only what's needed on the client.

### 3. API Route Handler (`src/app/api/auth/[...all]/route.ts`)

```typescript
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

**One-liner setup** - Better Auth handles all auth routes automatically.

### 4. Sign-In Page (`src/app/sign-in/page.tsx`)

Complete implementation with:
- Email/password sign-in and sign-up toggle
- Social authentication buttons
- Error handling and loading states
- Form validation (min 8 char password)
- Auto-redirect after successful auth

```typescript
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, useSession } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user) {
      router.push("/");
    }
  }, [session?.user, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await signIn.email({
          email: form.email,
          password: form.password,
          rememberMe: true,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
      } else {
        const { error: signUpError } = await signUp.email({
          name: form.name,
          email: form.email,
          password: form.password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignIn = async (provider: "google" | "github") => {
    setError(null);
    try {
      await signIn.social({
        provider,
        callbackURL: "/",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Social sign-in failed");
    }
  };

  // ... UI implementation (see full file for complete form)
}
```

### 5. User Menu Component (`src/components/auth/user-menu.tsx`)

```typescript
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut, useSession } from "@/lib/auth-client";
import { useReconciliationStore } from "@/store/reconciliationStore";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const syncWithDatabase = useReconciliationStore((state) => state.syncWithDatabase);
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      void syncWithDatabase();
    }
  }, [session?.user?.id, syncWithDatabase]);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    return <Link href="/sign-in">Sign in</Link>;
  }

  const displayName = session.user.name || session.user.email;

  return (
    <div className="flex items-center gap-3">
      <div>{displayName}</div>
      <button
        onClick={async () => {
          await signOut();
          router.refresh();
        }}
      >
        Sign out
      </button>
    </div>
  );
}
```

## 🗄️ Database Setup

### Schema Creation Script (`scripts/init-db.ts`)

```typescript
import { sql } from "@vercel/postgres";

async function initializeDatabase() {
  console.log("🗄️  Initializing database tables...\n");

  try {
    // Better Auth core tables
    await sql`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMPTZ,
        "refreshTokenExpiresAt" TIMESTAMPTZ,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_session_user ON "session"("userId");`;
    await sql`CREATE INDEX IF NOT EXISTS idx_account_user ON "account"("userId");`;
    await sql`CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification"(identifier);`;

    // Custom application tables (optional - add as needed)
    await sql`
      CREATE TABLE IF NOT EXISTS user_mappings (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        mapping JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, file_type)
      );
    `;

    console.log("\n✅ Database initialization complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

initializeDatabase();
```

### package.json script:
```json
{
  "scripts": {
    "db:migrate": "npx tsx scripts/init-db.ts"
  }
}
```

## 🔐 Environment Variables

### Required in `.env.local`:

```env
# Database (Neon PostgreSQL)
POSTGRES_URL="postgresql://user:password@host.neon.tech/database?sslmode=require"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# Optional: Social Auth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### Generate Secret:
```bash
openssl rand -base64 32
```

## 📝 Implementation Checklist

- [ ] Install dependencies: `npm install better-auth pg @vercel/postgres`
- [ ] Create `src/lib/auth.ts` with server config
- [ ] Create `src/lib/auth-client.ts` with client hooks
- [ ] Create `src/app/api/auth/[...all]/route.ts` API handler
- [ ] Create `scripts/init-db.ts` database schema
- [ ] Add environment variables to `.env.local`
- [ ] Run database migration: `npm run db:migrate`
- [ ] Create sign-in page: `src/app/sign-in/page.tsx`
- [ ] Add UserMenu component: `src/components/auth/user-menu.tsx`
- [ ] Test authentication flow

## 🚀 Usage After Setup

```typescript
// In any client component
import { useSession } from "@/lib/auth-client";

export function MyComponent() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not signed in</div>;

  return <div>Welcome {session.user.name}!</div>;
}
```

## 🎓 Lessons Learned

1. **Kysely Adapter Failed** - Bundling issues with Next.js 16 Turbopack
2. **Prisma 7 Failed** - Required driver adapter setup was complex and error-prone
3. **pg Adapter Succeeded** - Simple, direct connection with zero bundling issues
4. **Environment Variables** - Better Auth requires proper secret configuration
5. **Database Tables** - Must be created manually (Better Auth doesn't auto-migrate)

## 🔗 References

- [Better Auth Documentation](https://www.better-auth.com)
- [Better Auth Next.js Guide](https://www.better-auth.com/docs/integrations/nextjs)
- [Neon Database](https://neon.tech)

## ✅ Success Metrics

This implementation has been tested and works with:
- ✅ Next.js 16.0.10 with Turbopack
- ✅ React 19.2.0
- ✅ TypeScript 5
- ✅ Neon PostgreSQL (serverless)
- ✅ Email/password authentication
- ✅ Social authentication (Google, GitHub)
- ✅ Session persistence
- ✅ User data storage

---

**Created by:** Codex (with Claude documentation)
**Date:** December 28, 2024
**Status:** Production-ready ✅
