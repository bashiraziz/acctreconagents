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

export const auth = betterAuth({
  baseURL: authUrl,
  secret: resolvedSecret,
  database,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3100",
    // Add your production domain here via BETTER_AUTH_URL env var
    ...(process.env.BETTER_AUTH_URL && process.env.BETTER_AUTH_URL !== "http://localhost:3000"
      ? [process.env.BETTER_AUTH_URL]
      : []),
  ],
});
