/**
 * Better Auth configuration
 * Docs: https://www.better-auth.com/docs
 */

import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";

// Create Kysely database instance with explicit SSL config
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL!,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const db = new Kysely<any>({
  dialect: new PostgresDialect({
    pool,
  }),
});

// Catch unhandled rejections to see the actual error
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise);
  console.error('🚨 Reason:', reason);
  if (reason instanceof Error) {
    console.error('🚨 Stack:', reason.stack);
    console.error('🚨 Cause:', (reason as any).cause);
  }
});

// Initialize Better Auth with error handling
let authInstance: ReturnType<typeof betterAuth> | null = null;

function getAuth() {
  if (!authInstance) {
    try {
      console.log('🔧 Initializing Better Auth...');
      console.log('Database URL configured:', !!process.env.POSTGRES_URL);

      authInstance = betterAuth({
        database: db,

        trustedOrigins: ["http://localhost:3100"],

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
          disableCSRFCheck: process.env.NODE_ENV === 'development',
        },

        // Optional: Add social auth providers later
        // socialProviders: {
        //   google: {
        //     clientId: process.env.GOOGLE_CLIENT_ID!,
        //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        //   },
        // },
      });

      console.log('✅ Better Auth initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Better Auth:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }
  return authInstance;
}

export const auth = getAuth();

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
