/**
 * Better Auth configuration
 * Docs: https://www.better-auth.com/docs
 */

import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Create database connection pool with Neon-specific settings
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Handle pool errors to prevent unhandled rejections
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Initialize Better Auth with error handling
let authInstance: ReturnType<typeof betterAuth> | null = null;

function getAuth() {
  if (!authInstance) {
    try {
      authInstance = betterAuth({
        database: {
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
    } catch (error) {
      console.error('Failed to initialize Better Auth:', error);
      throw error;
    }
  }
  return authInstance;
}

export const auth = getAuth();

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
