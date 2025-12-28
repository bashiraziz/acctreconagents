# Better Auth + Next.js 16 Claude Code Plugin

Production-ready Better Auth authentication implementation for Next.js 16 with PostgreSQL. This Claude Code skill helps you add email/password and social authentication to your Next.js applications.

## 🚀 Quick Start

### Installation

```bash
# Add the marketplace
/plugin marketplace add bashiraziz/claude-better-auth-skill

# Install the plugin
/plugin install better-auth-nextjs@better-auth-marketplace

# Use the skill
/better-auth-nextjs
```

Or manually invoke in conversation:
```
Can you help me add Better Auth authentication to my Next.js app?
```

Claude will automatically use this skill when you mention authentication, login, or user management in Next.js projects.

## ✨ What This Skill Provides

- ✅ **Email/Password Authentication** - Complete sign-in/sign-up flow
- ✅ **Social Auth Ready** - Google and GitHub OAuth support
- ✅ **Session Management** - Secure session handling with PostgreSQL
- ✅ **Database Schema** - Auto-generated SQL schema with migrations
- ✅ **TypeScript Support** - Full type safety throughout
- ✅ **Next.js 16 Compatible** - Works with Turbopack (no bundling issues)
- ✅ **Production Ready** - Environment config, error handling, security best practices

## 📋 What You Get

This skill generates:

1. **Server Configuration** (`src/lib/auth.ts`)
   - Better Auth setup with PostgreSQL
   - Conditional SSL for Neon databases
   - Social provider configuration

2. **Client Hooks** (`src/lib/auth-client.ts`)
   - React hooks for session management
   - Sign-in/sign-out functions

3. **API Routes** (`src/app/api/auth/[...all]/route.ts`)
   - Automatic auth endpoint handling

4. **Sign-In Page** (`src/app/sign-in/page.tsx`)
   - Beautiful sign-in/sign-up form
   - Social auth buttons
   - Error handling

5. **User Menu Component** (`src/components/auth/user-menu.tsx`)
   - Session display
   - Sign-out button

6. **Database Schema** (`scripts/init-db.ts`)
   - User, session, account tables
   - Proper indexes and foreign keys

## 🎯 Use Cases

- Adding authentication to a new Next.js project
- Replacing existing auth (NextAuth.js, Firebase, etc.)
- Setting up user accounts and sessions
- Implementing social login
- Creating protected routes

## ⚙️ Requirements

- Next.js 16+ (tested with 16.0.10)
- React 19+ (tested with 19.2.0)
- PostgreSQL database (Neon, Supabase, or self-hosted)
- Node.js 18+

## 🔑 Critical Success Factor

**This skill uses the `pg` adapter, NOT Kysely or Prisma.**

Why? Kysely and Prisma adapters have bundling issues with Next.js 16 + Turbopack. The `pg` adapter works flawlessly.

## 📚 Documentation

Inside the skill:
- **SKILL.md** - Complete implementation guide with all code
- **QUICK_REFERENCE.md** - Common patterns and troubleshooting
- **README.md** - Quick start guide
- **env.example** - Environment variable template

## 🧪 Testing

This implementation has been battle-tested with:
- ✅ Next.js 16.0.10 + Turbopack
- ✅ React 19.2.0
- ✅ Better Auth 1.4.9
- ✅ Neon PostgreSQL (serverless)
- ✅ TypeScript 5

## 🤝 Contributing

Found an issue or have an improvement? Please open an issue or PR on GitHub:
https://github.com/bashiraziz/claude-better-auth-skill

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Credits

- **Implementation:** Codex AI
- **Documentation & Skill Creation:** Claude Code
- **Original Project:** Rowshni Reconciliation System

## 🔗 Related Resources

- [Better Auth Documentation](https://www.better-auth.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Claude Code Documentation](https://code.claude.com)
- [Neon PostgreSQL](https://neon.tech)

---

**Version:** 1.0.0
**Last Updated:** December 28, 2024
**Compatibility:** Next.js 16+, React 19+, Better Auth 1.4+
