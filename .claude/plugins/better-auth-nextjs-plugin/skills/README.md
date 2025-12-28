# Better Auth + Next.js 16 + PostgreSQL Skill

Production-ready authentication implementation using Better Auth with Next.js 16 and PostgreSQL.

## Quick Start

```bash
# Install dependencies
npm install better-auth pg @vercel/postgres

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Initialize database
npm run db:migrate

# Start development server
npm run dev
```

## What This Skill Provides

- ✅ Email/password authentication
- ✅ Social auth (Google, GitHub) ready
- ✅ User session management
- ✅ Database schema with migrations
- ✅ Sign-in/sign-up UI components
- ✅ TypeScript support
- ✅ Works with Next.js 16 + Turbopack

## Key Files

- `src/lib/auth.ts` - Server-side auth configuration
- `src/lib/auth-client.ts` - Client-side hooks
- `src/app/api/auth/[...all]/route.ts` - Auth API handler
- `src/app/sign-in/page.tsx` - Sign-in page
- `scripts/init-db.ts` - Database initialization

## Critical Success Factor

**Use the `pg` adapter, NOT Kysely or Prisma** - they have bundling issues with Next.js 16.

## Full Documentation

See `SKILL.md` for complete implementation guide.
