# Better Auth Quick Reference

## 30-Second Setup

```bash
# 1. Install
npm install better-auth pg @vercel/postgres

# 2. Create files (copy from skill templates):
# - src/lib/auth.ts
# - src/lib/auth-client.ts
# - src/app/api/auth/[...all]/route.ts
# - scripts/init-db.ts

# 3. Environment variables
POSTGRES_URL="postgresql://..."
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
BETTER_AUTH_URL="http://localhost:3000"

# 4. Initialize database
npm run db:migrate
```

## Common Patterns

### Check if user is signed in

```typescript
import { useSession } from "@/lib/auth-client";

export function MyComponent() {
  const { data: session } = useSession();

  if (!session) return <div>Sign in required</div>;
  return <div>Welcome {session.user.name}!</div>;
}
```

### Sign out button

```typescript
import { signOut } from "@/lib/auth-client";

<button onClick={() => signOut()}>Sign out</button>
```

### Protect a route

```typescript
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useEffect } from "react";

export default function ProtectedPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push("/sign-in");
    }
  }, [session, router]);

  if (!session) return null;

  return <div>Protected content</div>;
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MissingSecret" error | Add `BETTER_AUTH_SECRET` to `.env.local` |
| "No database connection" | Check `POSTGRES_URL` in `.env.local` |
| Tables don't exist | Run `npm run db:migrate` |
| Bundling errors | Ensure using `pg` adapter, NOT Kysely/Prisma |
| Social auth not working | Add provider credentials to `.env.local` |

## Database Access

```typescript
// Query user data
import { sql } from "@vercel/postgres";

const { rows } = await sql`
  SELECT * FROM "user" WHERE email = ${email}
`;
```

## Key Differences from NextAuth.js

| Feature | Better Auth | NextAuth.js |
|---------|-------------|-------------|
| TypeScript | Native, first-class | Bolt-on |
| Bundle size | Smaller | Larger |
| Database setup | Manual SQL | Auto-migrations |
| Social providers | Optional config | Required setup |
| API routes | Single catch-all | Multiple routes |

## Migration from Other Auth

### From NextAuth.js
1. Remove `next-auth` and `@auth/...` packages
2. Install `better-auth` and `pg`
3. Update session hooks: `useSession` from Better Auth
4. Recreate database tables with init-db script
5. Migrate user data to new schema

### From Firebase Auth
1. Export users from Firebase
2. Hash passwords (Better Auth uses bcrypt)
3. Import to PostgreSQL user table
4. Update client code to use Better Auth hooks

## Performance Tips

- Session tokens are cached client-side
- Database queries use connection pooling
- Neon PostgreSQL autoscales
- Social auth uses redirect flow (not popup)

---

**Remember:** Use `pg` adapter. Kysely and Prisma have bundling issues with Next.js 16.
