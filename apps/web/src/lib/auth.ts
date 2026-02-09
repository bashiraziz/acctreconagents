import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { Resend } from "resend";

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
const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || "support@rowshni.xyz";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
    sendResetPassword: async ({ user, url }, request) => {
      if (!resend) {
        console.warn("RESEND_API_KEY is not configured; skipping reset email.");
        return;
      }

      const emailPromise = resend.emails.send({
        from: resendFromEmail,
        to: user.email,
        subject: "Reset your Rowshni password",
        text: [
          `Hi ${user.name || "there"},`,
          "",
          "We received a request to reset your Rowshni password.",
          "Use the link below to set a new password:",
          url,
          "",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
        html: [
          `<p>Hi ${user.name || "there"},</p>`,
          "<p>We received a request to reset your Rowshni password.</p>",
          `<p><a href="${url}">Reset your password</a></p>`,
          "<p>If you did not request this, you can ignore this email.</p>",
        ].join(""),
      });

      const maybeWaitUntil = (request as { waitUntil?: (promise: Promise<unknown>) => void })
        .waitUntil;
      if (maybeWaitUntil) {
        maybeWaitUntil(emailPromise);
      } else {
        void emailPromise;
      }
    },
  },
  trustedOrigins: [
    // Development
    "http://localhost:3000",
    "http://localhost:3100",
    // Production domains
    "https://acctsreconagents.vercel.app",
    "https://www.rowshni.xyz",
    "https://rowshni.xyz", // Include non-www version
  ],
});
