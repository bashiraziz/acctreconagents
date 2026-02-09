"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestPasswordReset, resetPassword } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [errorParam, setErrorParam] = useState<string | null>(null);
  const isResetMode = Boolean(token);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
    setErrorParam(params.get("error"));
  }, []);

  const handleRequestReset = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await requestPasswordReset({ email, redirectTo });
      if (error) {
        setMessage(error.message || "Unable to request a reset link. Please try again.");
        setStatus("idle");
        return;
      }
      setMessage("If the email is registered, a reset link has been sent.");
      setStatus("success");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to request a reset link. Please try again."
      );
      setStatus("idle");
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    setMessage(null);

    try {
      const { error } = await resetPassword({ token, newPassword });
      if (error) {
        setMessage(error.message || "Unable to reset password. Please try again.");
        setStatus("idle");
        return;
      }
      setMessage("Password updated. You can now sign in.");
      setStatus("success");
      router.push("/sign-in");
      router.refresh();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to reset password. Please try again."
      );
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <header className="theme-card theme-border border-b p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">
            Account Access
          </p>
          <h1 className="mt-2 text-3xl font-semibold theme-text">
            {isResetMode ? "Set a new password" : "Reset your password"}
          </h1>
          <p className="mt-2 text-sm theme-text-muted">
            {isResetMode
              ? "Choose a new password for your account."
              : "We will email a reset link to the address on file."}
          </p>
        </header>

        <section className="rounded-3xl border theme-border bg-slate-950/60 p-6">
          {errorParam ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
              Reset link is invalid or expired. Please request a new link.
            </div>
          ) : null}

          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  New password
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                  placeholder="********"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Confirm password
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                  placeholder="********"
                />
              </label>

              {message && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {status === "submitting" ? "Updating..." : "Update password"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                  placeholder="you@company.com"
                />
              </label>

              {message && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {status === "submitting" ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <div className="mt-4 text-center text-sm text-slate-400">
            <Link href="/sign-in" className="font-semibold text-sky-300 hover:text-sky-200">
              Back to sign in
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
