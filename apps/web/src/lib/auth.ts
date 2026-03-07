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
function resolveAuthUrl(): string {
  const fallbackPort = process.env.PORT || "3000";
  const envUrl = process.env.BETTER_AUTH_URL?.trim();
  if (!envUrl) {
    return `http://localhost:${fallbackPort}`;
  }

  if (process.env.NODE_ENV === "production") {
    return envUrl;
  }

  try {
    const parsed = new URL(envUrl);
    const runningPort = process.env.PORT;
    if (
      runningPort &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      parsed.port !== runningPort
    ) {
      parsed.port = runningPort;
      return parsed.toString().replace(/\/$/, "");
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return envUrl;
  }
}

const authUrl = resolveAuthUrl();
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
    sendResetPassword: async (data, _request?: Request) => {
      void _request;
      const { user, url } = data;
      if (!resend) {
        console.warn("RESEND_API_KEY is not configured; skipping reset email.");
        return;
      }

      try {
        const result = await resend.emails.send({
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

        if ("error" in result && result.error) {
          console.error("Resend reset email failed:", result.error);
        } else {
          console.info("Resend reset email sent:", {
            id: "data" in result ? result.data?.id : undefined,
            to: user.email,
          });
        }
      } catch (error) {
        console.error("Resend reset email exception:", error);
      }
    },
  },
  trustedOrigins: Array.from(new Set([
    authUrl,
    // Development
    "http://localhost:3000",
    "http://localhost:3100",
    "http://localhost:3200",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3100",
    "http://127.0.0.1:3200",
    // Production domains
    "https://acctsreconagents.vercel.app",
    "https://www.rowshni.xyz",
    "https://rowshni.xyz", // Include non-www version
  ])),
});
