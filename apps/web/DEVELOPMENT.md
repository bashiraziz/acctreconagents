# Development Guide

## Running Without a Database (Anonymous Mode)

The app is designed to work perfectly **without a database** for development and testing.

### What Works Without Database

✅ **Full reconciliation functionality**
- Upload CSV files
- Map columns
- Run reconciliations
- View results
- All Gemini AI agents

✅ **Rate limiting**
- Anonymous users: 30 per hour, 50 per 2 hours, 70 per 3 hours
- IP-based tracking
- In-memory storage

✅ **UI/UX**
- Complete app functionality
- All features accessible

### What Requires Database

❌ **Authenticated features**
- User authentication (implemented with Better Auth)
- Persistent column mappings across sessions
- Reconciliation history
- Cross-device data sync

## Authentication Implementation

This app uses **Better Auth** with PostgreSQL for user authentication. The implementation includes:

- Email/password authentication
- Social auth (Google, GitHub) ready
- Session management with database persistence
- User-specific rate limits (2x anonymous limits when authenticated)

### 🔌 Better Auth Claude Code Skill

The Better Auth implementation used in this project has been packaged as a **reusable Claude Code skill** available to the community:

**📦 Repository:** [bashiraziz/claude-better-auth-skill](https://github.com/bashiraziz/claude-better-auth-skill)

This skill can be used by Claude to implement similar Better Auth authentication in other Next.js 16 projects. It includes:
- Complete implementation guide
- Database schema and migrations
- Environment configuration
- Troubleshooting for common bundling issues (Kysely/Prisma with Turbopack)

**Note:** The skill uses the `pg` (node-postgres) adapter instead of Kysely or Prisma to avoid bundling issues with Next.js 16 + Turbopack.

### Expected Behavior

The app runs in **anonymous mode**:
- All users treated as anonymous
- Rate limits applied (30/hour, 50/2hours, 70/3hours)
- Banner shown: "Anonymous Mode - full features available"
- Data stored in **browser localStorage** (persists until browser data is cleared)

### Database Support (Optional)

Database support enables user authentication and persistence, but the app remains fully functional in anonymous mode.

---

## Troubleshooting

#### Rate limits not working
**Check:**
- Server is running (rate limits are server-side)
- Not using VPN/proxy (IP tracking may vary)
- Clear browser cache and localStorage

#### Session errors in console
**Normal behavior** when database is not configured. These are handled gracefully and don't affect functionality.

#### Database Connection Errors

If you see database connection errors, they are **normal** when `POSTGRES_URL` is not configured. The app gracefully falls back to anonymous mode with full functionality.

---

## Development Workflow

### Recommended Setup (No Database)

```bash
# 1. Start orchestrator
cd services/orchestrator
npm run dev

# 2. Start web app (in another terminal)
cd apps/web
npm run dev

# 3. Open browser
http://localhost:3000
```

### With Database (Optional)

Only needed if you want to:
- Save column mappings across sessions
- Track reconciliation history
- Enable user accounts
- Double rate limits for logged-in users

---

## Environment Variables

### Required (None!)
The app works out of the box with no environment variables.

### Optional (For Full Features)

```bash
# Orchestrator Service
ORCHESTRATOR_URL=http://localhost:4100

# API Keys (for AI features)
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Database (for auth/persistence)
POSTGRES_URL=postgresql://user:password@localhost:5432/dbname

# Authentication
BETTER_AUTH_SECRET=random-secret-key
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Rate Limiting
MATERIALITY_THRESHOLD=50  # Default threshold in dollars
```

---

## Testing

### Without Database (Recommended for Development)

```bash
# Run automated scenario tests
npm test

# Verbose output
npm run test:verbose

# Specific scenario
npm test -- --scenario=01-simple-balanced
```

### With Database

Same as above, but users can sign in to get higher rate limits during testing.

---

## Production Deployment

For production, **database is recommended** but not required:

### Without Database (Free Tier)
- Users can use the app immediately
- No sign-up required
- Rate limits prevent abuse
- Data stored client-side only

### With Database (Full Features)
- User accounts and persistence
- Higher rate limits for authenticated users (2x)
- Cross-device sync
- Reconciliation history

---

## Port Configuration

Default ports:
- **Web App**: 3000 (falls back to 3001, 3002, etc. if occupied)
- **Orchestrator**: 4100

To change:
```bash
# Web app
PORT=3100 npm run dev

# Orchestrator
cd services/orchestrator
# Edit package.json or set environment variable
```

---

## Common Questions

**Q: Do I need a database to develop?**
A: No! The app works perfectly without one.

**Q: Why am I seeing auth errors in the console?**
A: Expected when no database is configured. They're handled gracefully.

**Q: Can I test the full app without API keys?**
A: Yes, but AI agents won't run. Upload/mapping/reconciliation still works.

**Q: How do I disable rate limiting for testing?**
A: Either (1) configure a database and sign in, or (2) set `MATERIALITY_THRESHOLD=999999999` to make limits very high.

**Q: Is this production-ready?**
A: Yes! Both modes (with/without database) are production-ready.
