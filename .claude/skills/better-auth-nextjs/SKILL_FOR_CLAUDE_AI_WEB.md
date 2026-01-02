# Better Auth for Next.js 16

You are an expert at implementing Better Auth authentication in Next.js 16+ applications. When the user asks you to add authentication, login, or user management to their Next.js app, follow this guide.

## Critical Success Factor

**Always use the `pg` (node-postgres) adapter with Better Auth, NEVER Kysely or Prisma adapters.**

Why? Kysely and Prisma have bundling issues with Next.js 16 + Turbopack. The pg adapter works flawlessly.

## Installation

```bash
npm install better-auth pg @vercel/postgres
```

## Implementation Steps

### 1. Server Auth Configuration (`src/lib/auth.ts`)

```typescript
import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.POSTGRES_URL;
const ssl = databaseUrl?.includes("neon.tech")
  ? { rejectUnauthorized: false }
  : undefined;

const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret && process.env.NODE_ENV === "production") {
  throw new Error("BETTER_AUTH_SECRET is required in production.");
}

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ssl })
  : undefined;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: authSecret || "dev-insecure-secret-please-set-env",
  database,
  emailAndPassword: { enabled: true },
  socialProviders: {
    // Optional: Add if credentials exist
    ...(process.env.GOOGLE_CLIENT_ID && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    }),
  },
});
```

### 2. Client Hooks (`src/lib/auth-client.ts`)

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
export const { signIn, signOut, signUp, useSession, getSession } = authClient;
```

### 3. API Route (`src/app/api/auth/[...all]/route.ts`)

```typescript
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

### 4. Database Schema (`scripts/init-db.ts`)

```typescript
import { sql } from "@vercel/postgres";

async function initializeDatabase() {
  // User table
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

  // Session table
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

  // Account table
  await sql`
    CREATE TABLE IF NOT EXISTS "account" (
      id TEXT PRIMARY KEY,
      "accountId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "accessToken" TEXT,
      "refreshToken" TEXT,
      password TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Verification table
  await sql`
    CREATE TABLE IF NOT EXISTS "verification" (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_session_user ON "session"("userId");`;
  await sql`CREATE INDEX IF NOT EXISTS idx_account_user ON "account"("userId");`;
}
```

Add to package.json: `"db:migrate": "npx tsx scripts/init-db.ts"`

### 5. Sign-In Page (`src/app/sign-in/page.tsx`)

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, useSession } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  if (session?.user) {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await signIn.email({
          email: form.email,
          password: form.password,
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
    } catch (err) {
      setError("Authentication failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1>{mode === "sign-in" ? "Sign In" : "Sign Up"}</h1>

        {mode === "sign-up" && (
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({...form, email: e.target.value})}
        />

        <input
          type="password"
          placeholder="Password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({...form, password: e.target.value})}
        />

        {error && <p className="text-red-500">{error}</p>}

        <button type="submit">
          {mode === "sign-in" ? "Sign In" : "Sign Up"}
        </button>

        <button type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>
          {mode === "sign-in" ? "Need an account?" : "Have an account?"}
        </button>
      </form>
    </div>
  );
}
```

### 6. User Menu Component

```typescript
"use client";

import { signOut, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session?.user) return <a href="/sign-in">Sign in</a>;

  return (
    <div>
      <span>{session.user.name || session.user.email}</span>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
```

## Environment Variables

Add to `.env.local`:

```env
POSTGRES_URL="postgresql://user:password@host.neon.tech/db?sslmode=require"
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# Optional: Social Auth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Generate secret: `openssl rand -base64 32`

## Setup Checklist

1. Install dependencies
2. Create all files above
3. Add environment variables
4. Run database migration: `npm run db:migrate`
5. Start dev server: `npm run dev`
6. Test sign-up at `/sign-in`

## Common Usage Patterns

### Check if user is signed in
```typescript
const { data: session } = useSession();
if (!session) return <div>Sign in required</div>;
```

### Protect a route
```typescript
useEffect(() => {
  if (!session) router.push("/sign-in");
}, [session]);
```

### Sign out
```typescript
<button onClick={() => signOut()}>Sign out</button>
```

## Key Points to Remember

- Use `pg` adapter (NOT Kysely or Prisma)
- Manual database schema creation required
- Environment variables must be set
- Works with Next.js 16 + Turbopack
- Supports email/password + social auth
- TypeScript native

When implementing, always confirm these are set up correctly before testing.
