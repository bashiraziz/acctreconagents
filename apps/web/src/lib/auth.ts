/**
 * Better Auth configuration
 * Docs: https://www.better-auth.com/docs
 */

import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export const auth = betterAuth({
  database: {
    // Use Vercel Postgres pool
    provider: "postgres",
    client: pool,
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true for production
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },

  advanced: {
    cookiePrefix: "acctrecon",
    crossSubDomainCookies: {
      enabled: true,
    },
  },

  // Optional: Add social auth providers later
  // socialProviders: {
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  //   },
  // },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
